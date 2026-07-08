# Yonsei Design Reference for Claude

이 문서는 `C:\Users\ywis101\Desktop\rulesv5` UI에서 컬러스킴, 로고 삽입, 헤더, 폰트 사용만 추출한 재사용 가이드이다.

배치, 화면 분할, 검색 패널, 버튼 동작, HTMX 로직, 배포/배치 파일 구성은 이 문서 범위가 아니다.

## Source

- CSS: `C:\Users\ywis101\Desktop\rulesv5\static\style.css`
- Header template: `C:\Users\ywis101\Desktop\rulesv5\templates\index.html`
- Logo: `C:\Users\ywis101\Desktop\rulesv5\static\yonsei_logo.jpg`
- Fonts:
  - `C:\Users\ywis101\Desktop\rulesv5\static\fonts\Pretendard-Regular.woff2`
  - `C:\Users\ywis101\Desktop\rulesv5\static\fonts\Pretendard-Medium.woff2`
  - `C:\Users\ywis101\Desktop\rulesv5\static\fonts\Pretendard-Bold.woff2`

## Design Intent

- 연세대 미래캠 업무 도구용 조용한 다크 UI.
- 기본은 dark theme, 선택적으로 light theme 지원.
- 메인 색상은 Yonsei 계열 블루를 중심으로 하고, 보조 텍스트는 낮은 채도의 회청색을 사용한다.
- 로고는 흰 배경 박스 안에 넣어 다크 배경에서도 선명하게 보이게 한다.
- 한국어 행정/업무 UI에 맞춰 Pretendard를 로컬 폰트로 사용한다.

## Font

CDN을 쓰지 말고 로컬 `woff2`를 사용한다. 필요한 굵기는 400, 500, 700이다.

```css
@font-face {
  font-family: 'Pretendard';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('/static/fonts/Pretendard-Regular.woff2') format('woff2');
}

@font-face {
  font-family: 'Pretendard';
  font-style: normal;
  font-weight: 500;
  font-display: swap;
  src: url('/static/fonts/Pretendard-Medium.woff2') format('woff2');
}

@font-face {
  font-family: 'Pretendard';
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url('/static/fonts/Pretendard-Bold.woff2') format('woff2');
}

html,
body {
  font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 16.8px;
  line-height: 1.7;
}
```

## Color Scheme

### Dark Theme

```css
:root {
  --bg: #0D1117;
  --surface: #161B27;
  --surface2: #1E2640;
  --border: #2A3354;
  --primary: #3B5BDB;
  --primary-hover: #4C6EF5;
  --accent: #A5B4FC;
  --text: #E8EBF4;
  --text-sub: #8892B0;
  --hl: #3B5BDB28;
  --hl-faint: #3B5BDB14;
  --marker: #4C6EF5;
  --table-badge: #A5B4FC;
  --success: #34D399;
  --warn: #F87171;
  --radius-card: 8px;
  --radius-btn: 6px;
  --radius-badge: 4px;
  --shadow: 0 2px 12px rgba(0, 0, 0, 0.4);
}
```

### Light Theme

```css
:root[data-theme="light"] {
  --bg: #F7F8FA;
  --surface: #FFFFFF;
  --surface2: #EDF0F6;
  --border: #D5DAE3;
  --primary: #3B5BDB;
  --primary-hover: #2F4BC4;
  --accent: #2F4BC4;
  --text: #1A1F2E;
  --text-sub: #5B6577;
  --hl: #3B5BDB22;
  --hl-faint: #3B5BDB12;
  --marker: #3B5BDB;
  --table-badge: #2F4BC4;
  --success: #15924B;
  --warn: #C92A2A;
  --shadow: 0 2px 10px rgba(20, 30, 60, 0.10);
}
```

### Base Application Colors

```css
html,
body {
  margin: 0;
  padding: 0;
  background: var(--bg);
  color: var(--text);
  min-height: 100%;
}

a {
  color: var(--accent);
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}
```

## Logo

- 파일명: `yonsei_logo.jpg`
- 원본 크기: `173x173`
- 권장 위치: `/static/yonsei_logo.jpg`
- 권장 표시 높이: `32px`
- 다크 테마에서는 흰 배경 박스 안에 로고를 넣는다.
- 라이트 테마에서는 흰 박스를 제거하고 로고만 둔다.

```css
.logo-box {
  background: #fff;
  border-radius: 6px;
  padding: 4px;
  display: inline-flex;
}

.logo-box img {
  height: 32px;
  display: block;
}

:root[data-theme="light"] .logo-box {
  background: transparent;
  padding: 0;
  border-radius: 0;
}
```

## Header

헤더는 상단에 얇은 border만 두고, 과한 배경색이나 장식은 넣지 않는다.

```css
header.app {
  border-bottom: 1px solid var(--border);
}

header.app .inner {
  padding: 14px 20px;
  display: flex;
  align-items: center;
  gap: 12px;
}

header.app h1 {
  font-size: 20px;
  font-weight: 700;
  margin: 0;
}
```

HTML 기본 형태:

```html
<header class="app">
  <div class="inner">
    <a href="/" style="display:flex;align-items:center;gap:12px;color:inherit">
      <span class="logo-box">
        <img src="/static/yonsei_logo.jpg" alt="연세대학교">
      </span>
      <h1>{{ title }}</h1>
    </a>
    <span style="flex:1"></span>
  </div>
</header>
```

## Theme Initialization

기본값은 dark theme이다. 페이지가 그려지기 전에 `data-theme`을 먼저 지정하면 깜빡임이 줄어든다.

```html
<script>
  document.documentElement.setAttribute(
    'data-theme',
    localStorage.getItem('theme') || 'dark'
  );
</script>
```

## Minimal Reuse Checklist

- `Pretendard-Regular.woff2`, `Pretendard-Medium.woff2`, `Pretendard-Bold.woff2`를 `/static/fonts/`에 둔다.
- `yonsei_logo.jpg`를 `/static/`에 둔다.
- CSS 변수는 dark/light theme 모두 복사한다.
- `body`에 Pretendard, `16.8px`, `line-height: 1.7`을 적용한다.
- 헤더는 `header.app > .inner > a > .logo-box + h1` 구조를 사용한다.
- 배치, 패널 폭, 검색 UI, HTMX 동작은 이 문서 기준으로 복사하지 않는다.

