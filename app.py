"""폴더관리 Dashboard - FastAPI backend.

선택한 폴더와 이하 폴더의 폴더트리, 파일 갯수, 전체 파일 사이즈를 보여준다.
포트는 5000-6000 범위에서 비어있는 첫 포트를 사용한다.
"""
from __future__ import annotations

import json
import os
import shutil
import socket
import string
import threading
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"
CONFIG_PATH = BASE_DIR / "config.json"

app = FastAPI(title="폴더관리 Dashboard")

# 스캔 결과 인메모리 캐시. key = 정규화된 절대경로, value = tree dict
_scan_cache: dict[str, dict[str, Any]] = {}
_cache_lock = threading.Lock()


# ---------------------------------------------------------------------------
# config 저장/로드
# ---------------------------------------------------------------------------
def load_config() -> dict[str, Any]:
    if CONFIG_PATH.exists():
        try:
            return json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            pass
    return {"folders": []}


def save_config(cfg: dict[str, Any]) -> None:
    CONFIG_PATH.write_text(
        json.dumps(cfg, ensure_ascii=False, indent=2), encoding="utf-8"
    )


def norm(path: str) -> str:
    return os.path.normpath(os.path.abspath(path))


# ---------------------------------------------------------------------------
# 폴더 스캔
# ---------------------------------------------------------------------------
def scan_dir(path: str) -> dict[str, Any]:
    """재귀적으로 폴더를 스캔해 파일 갯수/사이즈/하위 폴더 트리를 만든다."""
    name = os.path.basename(path.rstrip("\\/")) or path
    node: dict[str, Any] = {
        "name": name,
        "path": path,
        "size": 0,          # 재귀 누적 사이즈(byte)
        "files": 0,         # 재귀 누적 파일 수
        "dirs": 0,          # 재귀 누적 하위 폴더 수
        "own_files": 0,     # 이 폴더 바로 아래 파일 수
        "children": [],
        "error": None,
    }
    try:
        entries = list(os.scandir(path))
    except (PermissionError, OSError) as exc:
        node["error"] = type(exc).__name__
        return node

    for entry in entries:
        try:
            if entry.is_dir(follow_symlinks=False):
                child = scan_dir(entry.path)
                node["children"].append(child)
                node["size"] += child["size"]
                node["files"] += child["files"]
                node["dirs"] += 1 + child["dirs"]
            elif entry.is_file(follow_symlinks=False):
                try:
                    node["size"] += entry.stat(follow_symlinks=False).st_size
                except OSError:
                    pass
                node["files"] += 1
                node["own_files"] += 1
        except OSError:
            continue

    # 하위 폴더는 사이즈 큰 순으로 정렬
    node["children"].sort(key=lambda c: c["size"], reverse=True)
    return node


def get_tree(path: str, use_cache: bool = True) -> dict[str, Any]:
    key = norm(path)
    with _cache_lock:
        if use_cache and key in _scan_cache:
            return _scan_cache[key]
    if not os.path.isdir(key):
        raise HTTPException(status_code=404, detail="폴더를 찾을 수 없습니다.")
    tree = scan_dir(key)
    with _cache_lock:
        _scan_cache[key] = tree
    return tree


def find_node(root: dict[str, Any], target: str) -> dict[str, Any] | None:
    """캐시된 트리 안에서 특정 경로의 노드를 찾는다."""
    if norm(root["path"]) == target:
        return root
    for child in root["children"]:
        if target == norm(child["path"]) or target.startswith(norm(child["path"]) + os.sep):
            found = find_node(child, target)
            if found:
                return found
    return None


def trim_tree(node: dict[str, Any], depth: int) -> dict[str, Any]:
    """지연 로딩을 위해 트리를 depth 만큼만 잘라 가벼운 사본을 만든다.

    잘린 노드에는 has_children 플래그를 붙여 프론트가 필요할 때만
    /api/subtree 로 더 깊은 단계를 불러오게 한다. (초기/갱신 속도 우선)
    """
    out = {
        "name": node["name"],
        "path": node["path"],
        "size": node["size"],
        "files": node["files"],
        "dirs": node["dirs"],
        "own_files": node["own_files"],
        "error": node["error"],
        "has_children": bool(node["children"]),
        "children": [],
    }
    if depth > 0:
        out["children"] = [trim_tree(c, depth - 1) for c in node["children"]]
    return out


# ---------------------------------------------------------------------------
# API 모델
# ---------------------------------------------------------------------------
class FolderIn(BaseModel):
    path: str


# ---------------------------------------------------------------------------
# 라우트
# ---------------------------------------------------------------------------
@app.get("/api/folders")
def api_folders() -> dict[str, Any]:
    cfg = load_config()
    out = []
    for p in cfg["folders"]:
        out.append({"path": p, "exists": os.path.isdir(p)})
    return {"folders": out}


@app.post("/api/folders")
def api_add_folder(body: FolderIn) -> dict[str, Any]:
    path = norm(body.path)
    if not os.path.isdir(path):
        raise HTTPException(status_code=400, detail="존재하지 않는 폴더입니다.")
    cfg = load_config()
    if path not in cfg["folders"]:
        cfg["folders"].append(path)
        save_config(cfg)
    return {"ok": True, "path": path}


@app.delete("/api/folders")
def api_remove_folder(body: FolderIn) -> dict[str, Any]:
    path = norm(body.path)
    cfg = load_config()
    cfg["folders"] = [p for p in cfg["folders"] if p != path]
    save_config(cfg)
    with _cache_lock:
        _scan_cache.pop(path, None)
    return {"ok": True}


@app.post("/api/reset")
def api_reset() -> dict[str, Any]:
    """완전초기화: 등록 폴더 및 캐시 모두 제거."""
    save_config({"folders": []})
    with _cache_lock:
        _scan_cache.clear()
    return {"ok": True}


@app.post("/api/refresh")
def api_refresh(body: FolderIn | None = None) -> dict[str, Any]:
    """갱신: 캐시를 비워 다음 조회 시 다시 스캔하게 한다."""
    with _cache_lock:
        if body and body.path:
            _scan_cache.pop(norm(body.path), None)
        else:
            _scan_cache.clear()
    return {"ok": True}


@app.get("/api/tree")
def api_tree(path: str, refresh: bool = False, depth: int = 2) -> dict[str, Any]:
    """루트 폴더 트리. depth 만큼만 잘라서 가볍게 반환(지연 로딩).

    막대바 분모로 쓸 드라이브 전체 용량(drive_total)도 함께 내려준다.
    """
    tree = get_tree(path, use_cache=not refresh)
    out = trim_tree(tree, depth)
    try:
        usage = shutil.disk_usage(norm(path))
        out["drive_total"] = usage.total
        out["drive_used"] = usage.used
    except OSError:
        out["drive_total"] = 0
        out["drive_used"] = 0
    return out


@app.get("/api/subtree")
def api_subtree(root: str, path: str, depth: int = 1) -> dict[str, Any]:
    """캐시된 루트에서 특정 하위 노드의 자식만 잘라 즉시 반환."""
    tree = get_tree(root, use_cache=True)
    node = find_node(tree, norm(path))
    if node is None:
        raise HTTPException(status_code=404, detail="노드를 찾을 수 없습니다.")
    return trim_tree(node, depth)


def _explorer_windows() -> set[int]:
    """현재 열려 있는 탐색기 창(CabinetWClass) 핸들 집합."""
    import ctypes

    user32 = ctypes.windll.user32
    found: set[int] = set()
    buf = ctypes.create_unicode_buffer(256)

    @ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.c_void_p, ctypes.c_void_p)
    def cb(hwnd, _):
        user32.GetClassNameW(hwnd, buf, 256)
        if buf.value in ("CabinetWClass", "ExploreWClass"):
            found.add(hwnd)
        return True

    user32.EnumWindows(cb, 0)
    return found


def _bring_to_front(hwnd: int) -> None:
    """지정한 창을 화면 맨 앞으로 (foreground lock 우회)."""
    import ctypes

    user32 = ctypes.windll.user32
    kernel32 = ctypes.windll.kernel32
    SW_RESTORE = 9
    user32.ShowWindow(hwnd, SW_RESTORE)
    fg = user32.GetForegroundWindow()
    fg_thread = user32.GetWindowThreadProcessId(fg, 0)
    cur_thread = kernel32.GetCurrentThreadId()
    # ALT 키를 살짝 눌러 foreground 잠금 해제 후 활성화
    user32.keybd_event(0x12, 0, 0, 0)          # ALT down
    user32.AttachThreadInput(cur_thread, fg_thread, True)
    user32.BringWindowToTop(hwnd)
    user32.SetForegroundWindow(hwnd)
    user32.AttachThreadInput(cur_thread, fg_thread, False)
    user32.keybd_event(0x12, 0, 2, 0)          # ALT up


def _open_and_front(path: str) -> None:
    """탐색기로 폴더를 열고 그 창을 맨 앞으로 가져온다."""
    import subprocess
    import time

    before = _explorer_windows()
    subprocess.Popen(["explorer", path])
    # 새 창이 뜰 때까지 잠깐 폴링
    target = None
    for _ in range(30):
        time.sleep(0.05)
        new = _explorer_windows() - before
        if new:
            target = next(iter(new))
            break
    if target is None:
        # 새 창이 안 생겼으면(기존 창 재사용 등) 아무 탐색기 창이나 앞으로
        wins = _explorer_windows()
        target = next(iter(wins)) if wins else None
    if target is not None:
        try:
            _bring_to_front(target)
        except OSError:
            pass


@app.post("/api/open")
def api_open(body: FolderIn) -> dict[str, Any]:
    """폴더를 Windows 탐색기에서 열고 창을 맨 앞으로 가져온다."""
    path = norm(body.path)
    if not os.path.isdir(path):
        raise HTTPException(status_code=404, detail="폴더를 찾을 수 없습니다.")
    if os.name != "nt":
        raise HTTPException(status_code=501, detail="이 OS에서는 지원되지 않습니다.")
    try:
        _open_and_front(path)
    except OSError as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    return {"ok": True, "path": path}


@app.get("/api/browse")
def api_browse(path: str = "") -> dict[str, Any]:
    """폴더 선택용 서버측 디렉토리 브라우저."""
    if not path:
        # Windows 드라이브 목록
        drives = []
        for letter in string.ascii_uppercase:
            d = f"{letter}:\\"
            if os.path.exists(d):
                drives.append({"name": d, "path": d})
        return {"path": "", "parent": None, "dirs": drives}

    path = norm(path)
    if not os.path.isdir(path):
        raise HTTPException(status_code=404, detail="폴더를 찾을 수 없습니다.")

    dirs = []
    try:
        for entry in os.scandir(path):
            try:
                if entry.is_dir(follow_symlinks=False):
                    dirs.append({"name": entry.name, "path": entry.path})
            except OSError:
                continue
    except (PermissionError, OSError) as exc:
        raise HTTPException(status_code=403, detail=type(exc).__name__)

    dirs.sort(key=lambda d: d["name"].lower())
    parent = os.path.dirname(path.rstrip("\\/"))
    # 드라이브 루트면 parent를 드라이브 목록("")으로
    if parent == path or len(path) <= 3:
        parent = ""
    return {"path": path, "parent": parent, "dirs": dirs}


@app.get("/")
def index() -> FileResponse:
    return FileResponse(STATIC_DIR / "index.html")


app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


# ---------------------------------------------------------------------------
# 포트 선택 + 실행
# ---------------------------------------------------------------------------
def find_free_port(start: int = 5000, end: int = 6000) -> int:
    for port in range(start, end + 1):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(("127.0.0.1", port))
                return port
            except OSError:
                continue
    raise RuntimeError("5000-6000 범위에 사용 가능한 포트가 없습니다.")


if __name__ == "__main__":
    import sys
    import uvicorn
    import webbrowser

    # Windows 콘솔에서 한글 출력 인코딩 보장
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8")
        except (AttributeError, ValueError):
            pass

    port = find_free_port()
    url = f"http://127.0.0.1:{port}"
    print(f"\n  폴더관리 Dashboard  ->  {url}\n")
    # 서버가 뜬 뒤 브라우저 자동 오픈
    threading.Timer(1.2, lambda: webbrowser.open(url)).start()
    uvicorn.run(app, host="127.0.0.1", port=port)
