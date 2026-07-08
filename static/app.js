'use strict';

/* ===== helpers ===== */
async function api(url, opts) {
  const res = await fetch(url, opts);
  if (!res.ok) {
    let msg = res.statusText;
    try { msg = (await res.json()).detail || msg; } catch (e) {}
    throw new Error(msg);
  }
  return res.json();
}
function jpost(url, body) {
  return api(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
}
function jdelete(url, body) {
  return api(url, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function fmtBytes(n) {
  if (n === 0) return { v: '0', u: 'B' };
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(n) / Math.log(1024)));
  const v = n / Math.pow(1024, i);
  return { v: v >= 100 || i === 0 ? Math.round(v).toString() : v.toFixed(1), u: units[i] };
}
function bytesStr(n) { const b = fmtBytes(n); return b.v + ' ' + b.u; }
function fmtNum(n) { return n.toLocaleString('ko-KR'); }

let toastTimer = null;
function toast(msg, isErr) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show' + (isErr ? ' err' : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.className = 'toast'; }, 2600);
}

/* ===== theme ===== */
document.getElementById('themeBtn').addEventListener('click', () => {
  const cur = document.documentElement.getAttribute('data-theme');
  const next = cur === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
});

/* ===== bar mode (막대 기준) ===== */
let barMode = localStorage.getItem('barMode') || 'disk'; // 'disk' | 'parent'

/* ===== tree rendering (lazy) ===== */
function makeNode(node, rootPath, driveTotal, parentSize, level) {
  level = level || 0;
  const el = document.createElement('div');
  el.className = 'node';

  const row = document.createElement('div');
  row.className = 'row';

  // 1열: 이름 셀 (들여쓰기는 여기에만 → 뒤 컬럼 정렬 유지)
  const nameCell = document.createElement('div');
  nameCell.className = 'name-cell';
  nameCell.style.paddingLeft = (level * 20) + 'px';

  const twist = document.createElement('span');
  twist.className = 'twist' + (node.has_children ? '' : ' leaf');
  twist.textContent = '▶';

  const icon = document.createElement('span');
  icon.className = 'icon';
  icon.textContent = '📁';

  const nm = document.createElement('span');
  nm.className = 'nm';
  nm.textContent = node.name;
  nm.title = node.path;

  nameCell.appendChild(twist);
  nameCell.appendChild(icon);
  nameCell.appendChild(nm);
  row.appendChild(nameCell);

  // 2열: size bar — 분모는 막대 기준(디스크 전체 / 상위 폴더)
  const denom = barMode === 'disk' ? driveTotal : parentSize;
  const pct = denom > 0 ? (node.size / denom) * 100 : 0;
  const bar = document.createElement('span');
  bar.className = 'bar';
  bar.title = pct > 0
    ? pct.toFixed(pct < 1 ? 2 : 1) + '% (' + (barMode === 'disk' ? '디스크 전체' : '상위 폴더') + ' 대비)'
    : '0%';
  const bi = document.createElement('i');
  // 0 이 아니면 최소 3px 슬라이버로 보이게
  bi.style.width = node.size > 0 && pct > 0 ? 'max(3px, ' + pct.toFixed(2) + '%)' : '0';
  bar.appendChild(bi);
  row.appendChild(bar);

  // 3열: 사이즈
  const sizeB = document.createElement('span');
  sizeB.className = 'badge size';
  sizeB.textContent = bytesStr(node.size);
  row.appendChild(sizeB);

  // 4열: 파일 갯수 (또는 접근불가)
  if (node.error) {
    const e = document.createElement('span');
    e.className = 'badge err';
    e.textContent = '접근불가';
    row.appendChild(e);
  } else {
    const filesB = document.createElement('span');
    filesB.className = 'badge files';
    filesB.textContent = '📄 ' + fmtNum(node.files);
    row.appendChild(filesB);
  }

  el.appendChild(row);

  const kids = document.createElement('div');
  kids.className = 'children collapsed';
  el.appendChild(kids);

  let loaded = false;
  function renderKids(children) {
    kids.innerHTML = '';
    children.forEach((c) => kids.appendChild(makeNode(c, rootPath, driveTotal, node.size, level + 1)));
    loaded = true;
  }
  if (node.children && node.children.length) renderKids(node.children);

  async function toggle() {
    if (!node.has_children) return;
    const open = kids.classList.toggle('collapsed') === false;
    twist.classList.toggle('open', open);
    if (open && !loaded) {
      kids.innerHTML = '<div class="loading"><span class="spinner"></span> 불러오는 중…</div>';
      try {
        const sub = await api(
          `/api/subtree?root=${encodeURIComponent(rootPath)}&path=${encodeURIComponent(node.path)}&depth=1`
        );
        renderKids(sub.children || []);
      } catch (err) {
        kids.innerHTML = '<div class="loading">불러오기 실패: ' + err.message + '</div>';
      }
    }
  }
  // twist = 펼치기/접기, 이름/아이콘 = 폴더 열기(탐색기)
  twist.addEventListener('click', toggle);
  nm.title = node.path + '  (클릭하면 폴더 열기)';
  nm.addEventListener('click', () => openFolder(node.path));
  icon.addEventListener('click', () => openFolder(node.path));

  return el;
}

async function openFolder(path) {
  try { await jpost('/api/open', { path: path }); }
  catch (e) { toast('폴더 열기 실패: ' + e.message, true); }
}

/* ===== main load ===== */
let managedFolders = [];

async function loadDashboard(refresh) {
  const content = document.getElementById('content');
  const stats = document.getElementById('stats');
  const status = document.getElementById('statusLine');

  const fr = await api('/api/folders');
  managedFolders = fr.folders;

  if (!managedFolders.length) {
    stats.style.display = 'none';
    content.innerHTML =
      '<div class="empty"><div class="big">📂</div>' +
      '<div>등록된 폴더가 없습니다.</div>' +
      '<div style="margin-top:6px;font-size:14px">상단의 <b>📁 폴더관리</b> 버튼으로 폴더를 추가하세요.</div></div>';
    status.textContent = '';
    return;
  }

  content.innerHTML = '<div class="empty"><span class="spinner"></span> 스캔 중…</div>';
  status.textContent = refresh ? '갱신 중…' : '스캔 중…';

  let totFiles = 0, totDirs = 0, totSize = 0;
  const frag = document.createDocumentFragment();

  for (const f of managedFolders) {
    const card = document.createElement('div');
    card.className = 'folder-card';
    if (!f.exists) {
      card.innerHTML =
        '<div class="head"><div><div class="root-name">⚠ 폴더 없음</div>' +
        '<div class="root-path">' + f.path + '</div></div></div>';
      frag.appendChild(card);
      continue;
    }
    try {
      const q = refresh ? '&refresh=true' : '';
      const tree = await api(`/api/tree?path=${encodeURIComponent(f.path)}&depth=2${q}`);
      totFiles += tree.files; totDirs += tree.dirs; totSize += tree.size;
      const driveTotal = tree.drive_total || 0;
      const diskPct = driveTotal > 0 ? (tree.size / driveTotal) * 100 : 0;

      const head = document.createElement('div');
      head.className = 'head';
      head.innerHTML =
        '<div><div class="root-name">📁 ' + tree.name + '</div>' +
        '<div class="root-path">' + tree.path +
        (driveTotal > 0 ? '　·　드라이브 ' + bytesStr(driveTotal) : '') + '</div></div>' +
        '<div class="head-badges">' +
        (driveTotal > 0 ? '<span class="badge" title="이 폴더 / 드라이브 전체">💽 디스크의 ' +
          (diskPct < 1 ? diskPct.toFixed(2) : diskPct.toFixed(1)) + '%</span>' : '') +
        '<span class="badge">📂 ' + fmtNum(tree.dirs) + ' 폴더</span>' +
        '<span class="badge files">📄 ' + fmtNum(tree.files) + ' 파일</span>' +
        '<span class="badge size">' + bytesStr(tree.size) + '</span>' +
        '</div>';
      card.appendChild(head);
      const rn = head.querySelector('.root-name');
      rn.style.cursor = 'pointer';
      rn.title = tree.path + '  (클릭하면 폴더 열기)';
      rn.addEventListener('click', () => openFolder(tree.path));

      const treeWrap = document.createElement('div');
      treeWrap.className = 'tree';
      // 루트의 자식들을 바로 표시
      (tree.children || []).forEach((c) =>
        treeWrap.appendChild(makeNode(c, tree.path, driveTotal, tree.size, 0))
      );
      if (!tree.children || !tree.children.length) {
        treeWrap.innerHTML = '<div class="loading" style="padding:10px">하위 폴더가 없습니다. (파일 ' + fmtNum(tree.own_files) + '개)</div>';
      }
      card.appendChild(treeWrap);
    } catch (err) {
      card.innerHTML =
        '<div class="head"><div><div class="root-name">⚠ 스캔 실패</div>' +
        '<div class="root-path">' + f.path + ' — ' + err.message + '</div></div></div>';
    }
    frag.appendChild(card);
  }

  content.innerHTML = '';
  content.appendChild(frag);

  document.getElementById('stFolders').textContent = fmtNum(managedFolders.length);
  document.getElementById('stDirs').textContent = fmtNum(totDirs);
  document.getElementById('stFiles').textContent = fmtNum(totFiles);
  const sz = fmtBytes(totSize);
  document.getElementById('stSize').innerHTML = sz.v + '<span class="unit">' + sz.u + '</span>';
  stats.style.display = 'flex';
  status.textContent = '마지막 스캔: 방금';
}

document.getElementById('refreshBtn').addEventListener('click', async () => {
  try { await jpost('/api/refresh'); await loadDashboard(true); toast('갱신 완료'); }
  catch (e) { toast(e.message, true); }
});

/* ===== modal: 폴더선택관리 ===== */
const modalBack = document.getElementById('modalBack');
let browseCurrent = '';            // 현재 브라우징 중인 경로
const selectedPaths = new Set();   // 다중 선택 누적(경로별)
let viewItems = [];                // 현재 뷰의 폴더 항목들 (범위 선택용)
let anchorIndex = null;            // Shift 범위 선택 기준점

function openModal() { modalBack.classList.add('open'); selectedPaths.clear(); updateSelBtn(); browseTo(''); renderManaged(); }
function closeModal() { modalBack.classList.remove('open'); }

document.getElementById('manageBtn').addEventListener('click', openModal);
document.getElementById('modalClose').addEventListener('click', closeModal);
modalBack.addEventListener('click', (e) => { if (e.target === modalBack) closeModal(); });

function updateSelBtn() {
  const btn = document.getElementById('addSelectedBtn');
  btn.textContent = '＋ 선택 추가 (' + selectedPaths.size + ')';
  btn.disabled = selectedPaths.size === 0;
}

// 현재 뷰의 idx 항목 선택 상태 지정(이미 등록된 폴더는 무시)
function setSelected(idx, on) {
  const item = viewItems[idx];
  if (!item || item.managed) return;
  if (on) selectedPaths.add(item.path);
  else selectedPaths.delete(item.path);
  item.chk.checked = on;
  item.el.classList.toggle('selected', on);
}

function isManaged(path) {
  return managedFolders.some((f) => f.path === path);
}

async function browseTo(path) {
  const list = document.getElementById('browseList');
  const pathEl = document.getElementById('browsePath');
  const addBtn = document.getElementById('addCurrentBtn');
  list.innerHTML = '<div class="browse-item"><span class="spinner"></span></div>';
  try {
    const data = await api('/api/browse?path=' + encodeURIComponent(path));
    browseCurrent = data.path;
    pathEl.textContent = data.path || '드라이브 선택';
    addBtn.disabled = !data.path || isManaged(data.path);
    list.innerHTML = '';

    if (data.parent !== null) {
      const up = document.createElement('div');
      up.className = 'browse-item up';
      up.innerHTML = '<span class="icon" style="width:16px"></span><span class="nav"><span class="icon">↩</span><span>상위로</span></span>';
      up.querySelector('.nav').addEventListener('click', () => browseTo(data.parent));
      list.appendChild(up);
    }
    if (!data.dirs.length) {
      const e = document.createElement('div');
      e.className = 'browse-item'; e.style.color = 'var(--text-sub)';
      e.textContent = '하위 폴더 없음';
      list.appendChild(e);
    }

    viewItems = [];
    anchorIndex = null;
    data.dirs.forEach((d, idx) => {
      const it = document.createElement('div');
      it.className = 'browse-item' + (selectedPaths.has(d.path) ? ' selected' : '');
      const already = isManaged(d.path);

      const chk = document.createElement('input');
      chk.type = 'checkbox';
      chk.className = 'chk';
      chk.checked = selectedPaths.has(d.path);
      chk.disabled = already;
      chk.title = already ? '이미 등록됨' : '선택';
      chk.addEventListener('click', (e) => e.stopPropagation());
      chk.addEventListener('change', () => {
        setSelected(idx, chk.checked);
        anchorIndex = idx;
        updateSelBtn();
      });

      const nav = document.createElement('span');
      nav.className = 'nav';
      nav.innerHTML = '<span class="icon">📁</span><span class="nm">' + d.name + '</span>';
      nav.addEventListener('click', (e) => {
        if (already) return;
        if (e.ctrlKey || e.metaKey) {          // Ctrl-클릭: 개별 토글
          e.preventDefault();
          setSelected(idx, !selectedPaths.has(d.path));
          anchorIndex = idx;
          updateSelBtn();
        } else if (e.shiftKey) {               // Shift-클릭: 범위 선택
          e.preventDefault();
          const a = anchorIndex == null ? idx : anchorIndex;
          const lo = Math.min(a, idx), hi = Math.max(a, idx);
          for (let i = lo; i <= hi; i++) setSelected(i, true);
          updateSelBtn();
        } else {                               // 일반 클릭: 폴더 진입
          browseTo(d.path);
        }
      });

      it.appendChild(chk);
      it.appendChild(nav);
      if (already) {
        const a = document.createElement('span');
        a.className = 'added'; a.textContent = '✓ 등록됨';
        it.appendChild(a);
      }
      list.appendChild(it);
      viewItems.push({ path: d.path, el: it, chk: chk, managed: already });
    });
  } catch (err) {
    list.innerHTML = '<div class="browse-item" style="color:var(--warn)">' + err.message + '</div>';
  }
}

async function addPaths(paths) {
  let ok = 0, fail = 0;
  for (const p of paths) {
    try { await jpost('/api/folders', { path: p }); ok++; }
    catch (e) { fail++; }
  }
  await renderManaged();          // managedFolders 갱신
  loadDashboard(false);
  return { ok, fail };
}

document.getElementById('addCurrentBtn').addEventListener('click', async () => {
  if (!browseCurrent) return;
  const r = await addPaths([browseCurrent]);
  browseTo(browseCurrent);        // 등록됨 표시 갱신
  toast(r.ok ? '폴더 추가됨' : '추가 실패', !r.ok);
});

document.getElementById('addSelectedBtn').addEventListener('click', async () => {
  if (!selectedPaths.size) return;
  const paths = [...selectedPaths];
  const r = await addPaths(paths);
  selectedPaths.clear();
  updateSelBtn();
  browseTo(browseCurrent);
  toast(r.ok + '개 폴더 추가' + (r.fail ? ' (' + r.fail + '개 실패)' : ''), r.fail > 0);
});

async function renderManaged() {
  const el = document.getElementById('managedList');
  el.innerHTML = '<div class="managed-empty"><span class="spinner"></span></div>';
  const fr = await api('/api/folders');
  managedFolders = fr.folders;
  if (!managedFolders.length) {
    el.innerHTML = '<div class="managed-empty">등록된 폴더가 없습니다.</div>';
    return;
  }
  el.innerHTML = '';
  managedFolders.forEach((f) => {
    const it = document.createElement('div');
    it.className = 'managed-item';
    it.innerHTML =
      '<span class="icon" style="color:var(--marker)">📁</span>' +
      '<span class="p">' + f.path + (f.exists ? '' : ' <span class="miss">(없음)</span>') + '</span>';
    const rm = document.createElement('button');
    rm.className = 'btn danger sm';
    rm.textContent = '제거';
    rm.addEventListener('click', async () => {
      try { await jdelete('/api/folders', { path: f.path }); renderManaged(); loadDashboard(false); toast('제거됨'); }
      catch (e) { toast(e.message, true); }
    });
    it.appendChild(rm);
    el.appendChild(it);
  });
}

document.getElementById('refreshAllBtn').addEventListener('click', async () => {
  try { await jpost('/api/refresh'); await loadDashboard(true); toast('갱신 완료'); }
  catch (e) { toast(e.message, true); }
});

document.getElementById('resetBtn').addEventListener('click', async () => {
  if (!confirm('등록된 모든 폴더와 캐시를 삭제합니다. 계속할까요?')) return;
  try {
    await jpost('/api/reset');
    renderManaged();
    await loadDashboard(false);
    toast('완전초기화 완료');
  } catch (e) { toast(e.message, true); }
});

/* esc 닫기 */
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

/* ===== bar mode 세그먼트 토글 ===== */
const barSeg = document.getElementById('barModeSeg');
function syncBarSeg() {
  barSeg.querySelectorAll('button').forEach((b) =>
    b.classList.toggle('active', b.dataset.mode === barMode));
}
barSeg.addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn || btn.dataset.mode === barMode) return;
  barMode = btn.dataset.mode;
  localStorage.setItem('barMode', barMode);
  syncBarSeg();
  loadDashboard(false);   // 캐시 기반이라 빠르게 재렌더
});
syncBarSeg();

/* ===== init ===== */
loadDashboard(false);
