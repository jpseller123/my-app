'use strict';
// 오늘 안녕? — 기록은 이 휴대폰 안(localStorage)에만 저장됩니다.
const KEY_ENTRIES = 'my-app-entries';
const KEY_SETTINGS = 'my-app-settings';

const MOODS = [
  { e: '😆', n: '신나요', s: 5 },
  { e: '🥳', n: '축하해요', s: 5 },
  { e: '🤩', n: '설레요', s: 5 },
  { e: '🥰', n: '행복해요', s: 5 },
  { e: '😊', n: '좋아요', s: 4 },
  { e: '😇', n: '감사해요', s: 4 },
  { e: '😌', n: '편안해요', s: 4 },
  { e: '😎', n: '뿌듯해요', s: 4 },
  { e: '🥹', n: '뭉클해요', s: 4 },
  { e: '😅', n: '다행이에요', s: 4 },
  { e: '🤗', n: '따뜻해요', s: 4 },
  { e: '😋', n: '맛있었어요', s: 4 },
  { e: '🙂', n: '괜찮아요', s: 3 },
  { e: '😐', n: '보통', s: 3 },
  { e: '🤔', n: '생각이 많아요', s: 3 },
  { e: '😮', n: '놀랐어요', s: 3 },
  { e: '🥱', n: '지루해요', s: 2 },
  { e: '🤯', n: '정신없어요', s: 2 },
  { e: '😴', n: '피곤해요', s: 2 },
  { e: '😪', n: '졸려요', s: 2 },
  { e: '😰', n: '불안해요', s: 2 },
  { e: '😳', n: '민망해요', s: 2 },
  { e: '🥺', n: '서운해요', s: 2 },
  { e: '😢', n: '슬퍼요', s: 1 },
  { e: '😭', n: '너무 슬퍼요', s: 1 },
  { e: '😡', n: '화나요', s: 1 },
  { e: '😤', n: '답답해요', s: 1 },
  { e: '🤒', n: '아파요', s: 1 },
];
const DAYNAMES = ['일', '월', '화', '수', '목', '금', '토'];
const PERIODS = [
  { id: 'day', label: '하루', days: 1, text: '오늘' },
  { id: 'week', label: '일주일', days: 7, text: '최근 7일' },
  { id: 'month', label: '한 달', days: 30, text: '최근 30일' },
  { id: 'year', label: '일 년', days: 365, text: '최근 1년' },
];

/* ---------- 저장 / 불러오기 ---------- */
function load(key, fallback) {
  try {
    const v = JSON.parse(localStorage.getItem(key));
    return v == null ? fallback : v;
  } catch (e) { return fallback; }
}
function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; }
  catch (e) { return false; }
}
let entries = load(KEY_ENTRIES, {});      // { '2026-11-12': {date, did, moods:[이모지...], todos:[{t,done}], photo} }
let settings = load(KEY_SETTINGS, { on: false, time: '21:00' });
let tab = 'today';
let period = 'week';

// 내가 직접 추가한 이모지: [{e, n, s}] — 기본 이모지 뒤에 붙는다
const KEY_CUSTOM = 'my-app-custom-moods';
let customMoods = load(KEY_CUSTOM, []);
customMoods.forEach((m) => MOODS.push({ e: m.e, n: m.n, s: m.s, custom: true }));
function saveCustom() { return save(KEY_CUSTOM, MOODS.filter((m) => m.custom).map((m) => ({ e: m.e, n: m.n, s: m.s }))); }
function firstEmoji(text) {
  const t = text.trim();
  if (!t) return '';
  const g = typeof Intl !== 'undefined' && Intl.Segmenter ? [...new Intl.Segmenter('ko', { granularity: 'grapheme' }).segment(t)].map((x) => x.segment) : Array.from(t);
  return /\p{Extended_Pictographic}/u.test(g[0]) ? g[0] : '';
}

// 날씨: 위치 정보나 인터넷 없이 내가 직접 고른다
const WEATHERS = [
  { e: '☀️', n: '맑음' }, { e: '🌤️', n: '구름조금' }, { e: '☁️', n: '흐림' }, { e: '🌧️', n: '비' },
  { e: '⛈️', n: '천둥' }, { e: '❄️', n: '눈' }, { e: '🌫️', n: '안개' }, { e: '💨', n: '바람' },
];

// 오늘의 취향 항목: 기본 5가지 + 내가 추가한 것
const KINDS = ['음악', '그림', '책', '영화', '음식'];
const KEY_KINDS = 'my-app-custom-picks';
let customKinds = load(KEY_KINDS, []);
const allKinds = () => KINDS.concat(customKinds);
const picksOf = (en) => Object.entries((en && en.picks) || {}).filter(([, v]) => v && String(v).trim());

/* ---------- 날짜 ---------- */
const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const todayKey = () => ymd(new Date());
function fromKey(k) { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); }
function niceDate(k) { const d = fromKey(k); return `${d.getMonth() + 1}월 ${d.getDate()}일 (${DAYNAMES[d.getDay()]})`; }
function daysAgoKey(n) { const d = new Date(); d.setDate(d.getDate() - n); return ymd(d); }
function entriesIn(days) {
  const from = daysAgoKey(days - 1), to = todayKey();
  return Object.values(entries).filter((x) => x.date >= from && x.date <= to).sort((a, b) => b.date.localeCompare(a.date));
}

/* ---------- 도우미 ---------- */
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const moodOf = (e) => MOODS.find((m) => m.e === e);
// 예전 기록(기분 1개: mood)과 새 기록(여러 개: moods)을 모두 읽는다
const moodsOf = (en) => (Array.isArray(en.moods) ? en.moods : en.mood ? [en.mood] : []);

const STOP = new Set(['오늘', '하루', '그냥', '너무', '정말', '진짜', '조금', '많이', '아주', '그리고', '하지만', '했다', '했어', '했음', '하기', '해서', '있다', '없다', '있었다', '했는데', '이제', '다시']);
const JOSA = ['에서', '으로', '이랑', '하고', '까지', '부터', '에게', '한테', '이', '가', '은', '는', '을', '를', '에', '의', '도', '와', '과', '로', '랑'];
function words(list) {
  const count = {};
  list.forEach((en) => {
    const text = [en.did || '', ...(en.todos || []).map((t) => t.t)].join(' ');
    (text.match(/[가-힣]+|[A-Za-z]+/g) || []).forEach((raw) => {
      let w = raw.toLowerCase();
      if (/[가-힣]/.test(w)) {
        for (const j of JOSA) { if (w.length - j.length >= 2 && w.endsWith(j)) { w = w.slice(0, -j.length); break; } }
      }
      if (w.length < 2 || STOP.has(w)) return;
      count[w] = (count[w] || 0) + 1;
    });
  });
  return Object.entries(count).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 12);
}
function moodCounts(list) {
  const c = {};
  list.forEach((en) => moodsOf(en).forEach((m) => { c[m] = (c[m] || 0) + 1; }));
  return c;
}
function streak() {
  let n = 0;
  const d = new Date();
  if (!entries[ymd(d)]) d.setDate(d.getDate() - 1);   // 오늘 아직이면 어제부터 센다
  while (entries[ymd(d)]) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

/* ---------- 화면 그리기 ---------- */
const SVGO = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">';
const SMILE = SVGO + '<circle cx="12" cy="12" r="8"/><path d="M9 10v.01M15 10v.01M9 14.5c1.7 1.6 4.3 1.6 6 0"/></svg>';
const ICON = {
  flame: SVGO + '<path d="M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-6 1-9z"/></svg>',
  cal: SVGO + '<rect x="4" y="5" width="16" height="15" rx="5"/><path d="M8 3v4M16 3v4M4 10h16"/></svg>',
  check: SVGO + '<circle cx="12" cy="12" r="8"/><path d="M8.5 12.5l2.5 2.5 4.5-5"/></svg>',
  smile: SMILE,
  go: SVGO + '<path d="M9 6l6 6-6 6"/></svg>',
  bell: SVGO + '<path d="M6 17h12l-1.5-2v-4a4.5 4.5 0 0 0-9 0v4z"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>',
};
const SPARK = '<svg class="spark" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2c1 6 4 9 10 10-6 1-9 4-10 10-1-6-4-9-10-10 6-1 9-4 10-10z"/></svg>';

// 점토 느낌의 귀여운 캐릭터 + 화분 + 별 (색은 팔레트 안에서만)
const CHAR = `<svg class="char" viewBox="0 0 130 120" aria-hidden="true">
  <defs>
    <radialGradient id="cgb" cx="35%" cy="28%" r="78%"><stop offset="0" stop-color="#FBD3C4"/><stop offset="1" stop-color="#F5BBA5"/></radialGradient>
    <radialGradient id="cgp" cx="35%" cy="28%" r="80%"><stop offset="0" stop-color="#D6E7DB"/><stop offset="1" stop-color="#B9D3C0"/></radialGradient>
    <radialGradient id="cgs" cx="35%" cy="28%" r="80%"><stop offset="0" stop-color="#FCEBC4"/><stop offset="1" stop-color="#F8DFA9"/></radialGradient>
  </defs>
  <ellipse cx="66" cy="112" rx="52" ry="6" fill="#B97D66" opacity=".16"/>
  <ellipse cx="108" cy="90" rx="5" ry="11" fill="#3F6B5A" transform="rotate(-25 108 90)"/>
  <ellipse cx="119" cy="90" rx="5" ry="11" fill="#3F6B5A" transform="rotate(25 119 90)"/>
  <path d="M101 98h24l-3 14h-18z" fill="url(#cgp)"/>
  <ellipse cx="54" cy="68" rx="42" ry="38" fill="url(#cgb)"/>
  <ellipse cx="38" cy="46" rx="13" ry="6" fill="#fff" opacity=".45" transform="rotate(-25 38 46)"/>
  <circle cx="42" cy="66" r="3.6" fill="#4A3A33"/><circle cx="66" cy="66" r="3.6" fill="#4A3A33"/>
  <ellipse cx="33" cy="76" rx="6" ry="4" fill="#EE8F73" opacity=".5"/><ellipse cx="75" cy="76" rx="6" ry="4" fill="#EE8F73" opacity=".5"/>
  <path d="M48 75q6 6 12 0" fill="none" stroke="#4A3A33" stroke-width="2.6" stroke-linecap="round"/>
  <path d="M104 12l4 9 10 1-8 7 3 10-9-6-9 6 3-10-8-7 10-1z" fill="url(#cgs)" stroke="#F8DFA9" stroke-width="3" stroke-linejoin="round"/>
</svg>`;
const STAR = `<svg class="star" viewBox="0 0 48 48" aria-hidden="true">
  <defs><radialGradient id="sgs" cx="35%" cy="28%" r="80%"><stop offset="0" stop-color="#FCEBC4"/><stop offset="1" stop-color="#F8DFA9"/></radialGradient></defs>
  <path d="M24 5l5.5 12 13 1.5-9.6 8.8 2.7 12.9L24 33.2 12.4 40.2l2.7-12.9L5.5 18.5l13-1.5z" fill="url(#sgs)" stroke="#F8DFA9" stroke-width="4" stroke-linejoin="round"/>
  <circle cx="19" cy="23" r="1.8" fill="#4A3A33"/><circle cx="29" cy="23" r="1.8" fill="#4A3A33"/>
  <path d="M21.5 28q2.5 2.5 5 0" fill="none" stroke="#4A3A33" stroke-width="1.8" stroke-linecap="round"/>
</svg>`;

const PAL = [['mint', '#B9D3C0'], ['butter', '#F8DFA9'], ['blush', '#F5BBA5'], ['fog', '#C9D4DE'], ['coral', '#EE8F73']];

function avgMood(list) {
  const sc = list.flatMap((x) => moodsOf(x).map((e) => (moodOf(e) || {}).s).filter((s) => s != null));
  return sc.length ? sc.reduce((a, b) => a + b, 0) / sc.length : null;
}
function weekCount(back) {   // 이번 주(0) / 지난주(1)에 기록한 날 수 (일요일 시작)
  const now = new Date(), start = new Date(now);
  start.setDate(now.getDate() - now.getDay() - 7 * back);
  let n = 0;
  for (let i = 0; i < 7; i++) { const d = new Date(start); d.setDate(start.getDate() + i); if (entries[ymd(d)]) n++; }
  return n;
}
const weatherOf = (e) => WEATHERS.find((w) => w.e === e);

/* ---------- 지금 날씨: "안녕하세요" 옆에 그림 + 온도만 ----------
   Open-Meteo(열쇠 · 로그인 없이 쓰는 무료 날씨 서비스)에서 가져온다. 보내는 것은 장소의 위도 · 경도 숫자뿐이다. */
const KEY_WX = 'my-app-weather';
const PLACES = [['서울', 37.57, 126.98], ['부산', 35.18, 129.08], ['대구', 35.87, 128.6], ['인천', 37.46, 126.71], ['광주', 35.16, 126.85],
  ['대전', 36.35, 127.38], ['울산', 35.54, 129.31], ['세종', 36.48, 127.29], ['수원', 37.26, 127.03], ['춘천', 37.88, 127.73],
  ['청주', 36.64, 127.49], ['전주', 35.82, 127.15], ['제주', 33.5, 126.53]];
let wx = { data: null };
function getPlace() {
  const p = settings.place;
  return p && typeof p.lat === 'number' ? p : { name: PLACES[0][0], lat: PLACES[0][1], lon: PLACES[0][2] };
}
function wmo(code) {   // 날씨 코드 → 그림(이모지)과 이름
  if (code === 0 || code === 1) return { e: '☀️', n: '맑음' };
  if (code === 2) return { e: '🌤️', n: '구름 조금' };
  if (code === 3) return { e: '☁️', n: '흐림' };
  if (code === 45 || code === 48) return { e: '🌫️', n: '안개' };
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return { e: '🌧️', n: '비' };
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { e: '❄️', n: '눈' };
  if (code >= 95) return { e: '⛈️', n: '천둥 번개' };
  return { e: '☁️', n: '흐림' };
}
async function loadWeather(force) {   // 실시간: 앱을 열 때와 다시 돌아올 때마다, 10분이 지났으면 새로 받는다
  const p = getPlace(), key = p.lat + ',' + p.lon, cached = load(KEY_WX, null);
  const same = cached && cached.key === key && cached.data;
  if (same) wx = { data: cached.data };   // 먼저 저장된 값을 보여 주고, 오래됐으면 새로 받는다
  if (same && !force && Date.now() - cached.t < 10 * 60 * 1000) { updateWxPill(); return; }
  try {
    const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${p.lat}&longitude=${p.lon}&current=temperature_2m,weather_code&timezone=auto`);
    if (!r.ok) throw new Error('weather');
    const j = await r.json();
    const data = { temp: j.current.temperature_2m, code: j.current.weather_code };
    save(KEY_WX, { key, t: Date.now(), data });
    wx = { data };
  } catch (e) { /* 실패하면 저장된 값을 그대로 둔다 (없으면 알약을 숨긴다) */ }
  updateWxPill();
}
function updateWxPill() {
  const t = document.querySelector('.w-title');
  if (t) t.innerHTML = '안녕하세요' + wxPill();
}
function wxPill() {
  if (!wx.data) return '';
  const w = wmo(wx.data.code), t = Math.round(wx.data.temp);
  return ` <button class="wx-pill" data-act="wxplace" aria-label="${getPlace().name} 날씨 ${w.n} ${t}도. 눌러서 장소 바꾸기">${w.e} ${t}°</button>`;
}

// 모든 섹션과 도형이 아래에서 위로 부드럽게 떠오른다 (앱을 처음 열 때 · 탭이나 기간을 바꿀 때만. 체크하거나 저장해서 다시 그릴 때는 움직이지 않는다)
// "동작 줄이기" 설정과 상관없이 항상 재생한다 (내가 움직임을 원함)
let animateNext = true, chromeFaded = false;
function setupFade(c) {
  if (!animateNext) return;
  animateNext = false;
  if (!('IntersectionObserver' in window)) return;
  const done = (el) => setTimeout(() => { el.classList.remove('fu', 'in'); el.style.transitionDelay = ''; }, 1500);   // 끝나면 원래 모습으로
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    const el = e.target;
    io.unobserve(el);
    el.classList.add('in');
    done(el);
  }), { root: c, threshold: 0.05 });

  // 1) 맨 위(제목 · 버튼 · 주간 날짜 동그라미)와, 처음 열 때는 아래 탭바도: 바로 차례로
  const chrome = [...document.querySelectorAll('#top h1, #top .sub, #top .round, #top .seg, #top .day')];
  if (!chromeFaded) { chromeFaded = true; chrome.push(...document.querySelectorAll('.tabbar .tb, .tabbar .plus')); }
  chrome.forEach((el, i) => {
    el.classList.add('fu'); el.style.transitionDelay = Math.min(i, 14) * 40 + 'ms';
    setTimeout(() => el.classList.add('in'), 40);
    done(el);
  });

  // 2) 큰 칸은 하나씩, 카드 묶음(요약 카드 · 빠른 기록 · 지난 기간)은 낱개로 차례로
  const fade = (el, delay) => { el.classList.add('fu'); el.style.transitionDelay = delay + 'ms'; io.observe(el); };
  [...c.children].forEach((k, ki) => {
    const base = ki < 4 ? ki * 65 : 0;   // 처음 화면에 보이는 위쪽만 차례로, 아래쪽은 스크롤할 때 바로 (기다리지 않게)
    if (k.matches('.sum-grid, .quick, .past-grid')) [...k.children].forEach((g, gi) => fade(g, base + gi * 65));
    else fade(k, base);
  });

  // 3) 칸 안의 작은 도형들(아이콘 칩 · 썸네일 · 알약 · 막대 · 목록 줄 · 범례 · 말풍선 · 사진 · 캐릭터 · 도넛)도 각각, 칸이 나타난 뒤에 차례로
  const seen = new Map();
  c.querySelectorAll('.recent, .wcol, .lg, .chip, .bar-row, .pick-row, .todo-item, .photos img, .emoji-line, .mood-line, .chip-ico, .thumb, .go, .tag, .w-art, .w-title, .welcome .pill, .e-pic, .donut, .empty-ico, .mint-banner .star, .mint-banner .pill, .sec-head h2, .pill-s, .seg button').forEach((el) => {
    const n = seen.get(el.parentNode) || 0;
    seen.set(el.parentNode, n + 1);
    el.classList.add('fu');
    el.style.transitionDelay = 160 + Math.min(n, 6) * 55 + 'ms';
    io.observe(el);
  });
}

function render() {
  const c = $('#content');
  const keepTop = c.scrollTop;   // 할 일을 체크해도 위치가 그대로 있게
  document.querySelectorAll('.tb[data-tab]').forEach((b) => {
    const on = b.dataset.tab === tab;
    b.classList.toggle('active', on);
    b.setAttribute('aria-current', on ? 'page' : 'false');
  });
  $('#top').innerHTML = headerHtml();
  $('#btn-record').hidden = tab !== 'today';   // 둥둥 떠다니는 "기록" 버튼은 홈에서만
  c.innerHTML = tab === 'today' ? viewToday() : tab === 'summary' ? viewSummary() : viewPattern();
  c.scrollTop = keepTop;
  setupFade(c);
}

function headerHtml() {
  if (tab === 'today') {
    const en = entries[todayKey()], ms = en ? moodsOf(en) : [];
    return `<div class="title-row"><h1>오늘 안녕?${SPARK}</h1><div class="top-actions">
      <button class="round" data-act="notify" aria-label="알림 설정">${ICON.bell}</button>
      <button class="round avatar" data-act="record" aria-label="오늘 기록 열기">${ms.length ? ms[0] : SMILE}</button></div></div>` + weekStrip();
  }
  return tab === 'summary'
    ? `<h1>정리${SPARK}</h1><p class="sub">지나온 날들을 한눈에 돌아봐요</p>`
    : `<h1>통계${SPARK}</h1><p class="sub">쌓인 기록으로 나의 패턴을 살펴봐요</p>`;
}

function weekStrip() {
  const now = new Date(), start = new Date(now);
  start.setDate(now.getDate() - now.getDay());   // 이번 주 일요일
  let h = '<div class="week">';
  for (let i = 0; i < 7; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i);
    const k = ymd(d), isT = k === todayKey(), fut = k > todayKey();
    h += `<button class="day ${isT ? 'today' : ''}" ${fut ? 'disabled' : ''} data-day="${k}" aria-label="${niceDate(k)}${entries[k] ? ' 기록 있음' : ''}">
      <span class="dn">${DAYNAMES[i]}</span><span class="num">${d.getDate()}</span><i class="dot ${entries[k] ? 'on' : ''}"></i></button>`;
  }
  return h + '</div>';
}

function viewToday() {
  const en = entries[todayKey()];
  const ms = en ? moodsOf(en) : [];
  const todos = en ? en.todos || [] : [];
  const hasText = en && (en.did || ms.length);
  const st = streak();
  const l30 = entriesIn(30), l7 = entriesIn(7);

  // 환영 배너 오른쪽 칸: 사진 (오늘 사진이 있으면 오늘 것, 없으면 가장 최근 사진, 하나도 없으면 캐릭터)
  const withPhoto = (en && en.photo) ? en : Object.values(entries).filter((x) => x.photo).sort((a, b) => b.date.localeCompare(a.date))[0];
  const art = withPhoto
    ? `<div class="w-photo"><img src="${withPhoto.photo}" alt="${niceDate(withPhoto.date)} 사진"><span class="w-cap">${niceDate(withPhoto.date).replace(/ \(.\)/, '')}</span></div>`
    : CHAR;
  // 환영 배너
  let h = `<div class="welcome clay"><div class="w-text"><h2 class="w-title">안녕하세요${wxPill()}</h2>` +
    (hasText
      ? (en.did ? `<p class="did">${esc(en.did)}</p>` : '') + (ms.length ? `<div class="mood-line">${ms.join('')}</div>` : '')
      : `<p class="desc">오늘 하루를 한 줄로<br>남겨 볼까요?</p>`) +
    `<button class="pill coral" data-act="record">${en ? '기록 고치기' : '오늘 기록'}</button></div><div class="w-art">${art}</div></div>`;

  // 요약 카드 4장
  const wk = weekCount(0), diff = wk - weekCount(1);
  const todos30 = l30.flatMap((x) => x.todos || []), done30 = todos30.filter((t) => t.done).length;
  const rate = todos30.length ? Math.round((done30 / todos30.length) * 100) : null;
  const a30 = avgMood(l30), a7 = avgMood(l7);
  const cards = [
    { c: 'mint', i: ICON.flame, n: st, u: '일', l: '연속 기록', d: entries[todayKey()] ? '오늘 기록 완료' : '오늘 기록하면 +1' },
    { c: 'butter', i: ICON.cal, n: wk, u: '/7', l: '이번 주 기록', d: diff > 0 ? `지난주보다 +${diff}일` : diff < 0 ? `지난주보다 ${diff}일` : '지난주와 같아요' },
    { c: 'blush', i: ICON.check, n: rate == null ? '-' : rate, u: rate == null ? '' : '%', l: '할 일 끝낸 비율', d: todos30.length ? `${todos30.length}개 중 ${done30}개 완료` : '할 일을 적어 보세요' },
    { c: 'fog', i: ICON.smile, n: a30 == null ? '-' : a30.toFixed(1), u: '', l: '평균 기분 (5점)', d: a7 == null ? '기분을 골라 보세요' : `최근 7일 ${a7.toFixed(1)}` },
  ];
  h += `<div class="sum-grid">` + cards.map((x) =>
    `<div class="sum ${x.c} clay"><span class="chip-ico">${x.i}</span><div><div class="sum-n">${x.n}<small>${x.u}</small></div><div class="sum-l">${x.l}</div><div class="sum-d">${x.d}</div></div></div>`).join('') + `</div>`;

  // 해야 할 일
  h += `<div class="sec-head"><h2>해야 할 일</h2>${todos.length ? `<span class="pill-s">${todos.filter((t) => t.done).length}/${todos.length} 완료</span>` : ''}</div>
    <div class="card todo-card">` + (todos.length
    ? todos.map((t, i) => `<label class="todo-item ${t.done ? 'done' : ''}"><input type="checkbox" data-todo="${i}" ${t.done ? 'checked' : ''}><span>${esc(t.t)}</span></label>`).join('')
    : `<p class="desc">해야 할 일을 적어 두면 여기에서 체크할 수 있어요.</p>`) + `</div>`;

  // 오늘의 취향
  const pk = picksOf(en);
  if (pk.length) h += `<div class="sec-head"><h2>오늘의 취향</h2></div><div class="card">` + pk.map(([k, v]) => `<div class="pick-row"><span class="pk">${esc(k)}</span><span class="pt">${esc(v)}</span></div>`).join('') + `</div>`;

  // 빠른 기록
  h += `<div class="sec-head"><h2>빠른 기록</h2><button class="pill-s" data-tab="summary">전체 보기</button></div>
    <div class="quick">
      <button class="q blush clay" data-quick="mood"><span>오늘 기분은 어때요?</span><span class="tag">기분 고르기</span></button>
      <button class="q fog clay" data-quick="did"><span>오늘 뭘 했나요?</span><span class="tag">한 줄 쓰기</span></button>
      <button class="q butter clay" data-quick="todo"><span>잊지 말아야 할 일은?</span><span class="tag">할 일 적기</span></button>
    </div>`;

  // 최근 항목
  const recent = Object.values(entries).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);
  if (recent.length) {
    h += `<div class="sec-head"><h2>최근 항목</h2><button class="pill-s" data-tab="summary">전체 보기</button></div><div class="card recent-card">` + recent.map((x, i) => {
      const m = moodsOf(x), w = x.weather ? weatherOf(x.weather) : null, bg = PAL[i % 4][0];
      const thumb = x.photo ? `<img src="${x.photo}" alt="">` : `<span class="th-emo">${m[0] || (w ? w.e : '')}</span>`;
      const title = x.did || (picksOf(x)[0] ? picksOf(x)[0][0] + ' · ' + picksOf(x)[0][1] : (x.todos && x.todos[0] ? '해야 할 일: ' + x.todos[0].t : '기록'));
      return `<button class="recent" data-edit="${x.date}"><span class="thumb ${bg}">${thumb}</span>
        <span class="r-text"><span class="r-title">${esc(title)}</span><span class="r-sub">${niceDate(x.date)} ${m.join('')}${w ? ' ' + w.e : ''}</span></span>
        <span class="go">${ICON.go}</span></button>`;
    }).join('') + `</div>`;
  }

  // 맨 아래 민트 배너
  h += `<div class="mint-banner clay">${STAR}<span>하루 한 줄이면 충분해요</span><button class="pill coral small" data-act="record">기록</button></div>`;
  return h;
}

/* ---------- 기간 압축: 한 단어 + 그림 하나 ---------- */
const BUCKETS = {
  week: {
    title: '이번 주', past: '지난 주들', max: 8,
    key: (k) => { const d = fromKey(k); d.setDate(d.getDate() - d.getDay()); return ymd(d); },   // 그 주 일요일
    label: (b) => { const s = fromKey(b), e = new Date(s); e.setDate(s.getDate() + 6); return `${s.getMonth() + 1}/${s.getDate()} ~ ${e.getMonth() + 1}/${e.getDate()}`; },
  },
  month: { title: '이번 달', past: '지난 달들', max: 12, key: (k) => k.slice(0, 7), label: (b) => `${b.slice(0, 4)}년 ${Number(b.slice(5))}월` },
  year: { title: '올해', past: '지난 해들', max: 5, key: (k) => k.slice(0, 4), label: (b) => `${b}년` },
};
function essence(list) {   // 한 기간을 대표 그림 하나 + 대표 단어 하나로 줄인다
  if (!list.length) return null;
  const mc = moodCounts(list), topMood = Object.entries(mc).sort((a, b) => b[1] - a[1])[0];
  const ws = words(list);
  const moodName = topMood ? (moodOf(topMood[0]) || {}).n || '' : '';
  let word = '', wn = 0;
  if (ws.length && ws[0][1] >= 2) { word = ws[0][0]; wn = ws[0][1]; }   // 두 번 이상 쓴 말이 있으면 그 말
  else if (moodName) word = moodName;                                    // 없으면 가장 자주 느낀 기분
  else if (ws.length) { word = ws[0][0]; wn = ws[0][1]; }
  const wxc = {};
  list.forEach((x) => { if (x.weather) wxc[x.weather] = (wxc[x.weather] || 0) + 1; });
  const topWx = Object.entries(wxc).sort((a, b) => b[1] - a[1])[0];
  return { word: word || '기록', wn, emoji: topMood ? topMood[0] : topWx ? topWx[0] : '', mood: moodName, n: list.length };
}
function wordCards(pid) {
  const B = BUCKETS[pid];
  if (!B) return '';
  const groups = {};
  Object.values(entries).forEach((x) => { const b = B.key(x.date); (groups[b] = groups[b] || []).push(x); });
  const cur = B.key(todayKey()), ce = essence(groups[cur] || []);
  let h = `<div class="sec-head"><h2>${B.title}의 한 단어</h2><span class="pill-s">${B.label(cur)}</span></div>`;
  h += ce
    ? `<div class="card essence clay"><div class="e-pic">${ce.emoji || SMILE}</div><div class="e-word">${esc(ce.word)}</div>
        <p class="e-sub">${ce.n}일 기록${ce.wn >= 2 ? ` · 이 말을 ${ce.wn}번 썼어요` : ''}${ce.mood && ce.emoji ? ` · 기분은 주로 ${esc(ce.mood)}` : ''}</p></div>`
    : `<div class="card empty"><div class="empty-ico">${SMILE}</div>${B.title}은 아직 기록이 없어요.</div>`;
  const past = Object.keys(groups).sort().reverse().filter((k) => k !== cur).slice(0, B.max);
  if (past.length) {
    h += `<div class="sec-head"><h2>${B.past}</h2></div><div class="past-grid">` + past.map((k, i) => {
      const e = essence(groups[k]);
      return `<div class="past clay ${PAL[i % 4][0]}"><span class="p-pic">${e.emoji || SMILE}</span><span class="p-word">${esc(e.word)}</span><span class="p-lab">${B.label(k)} · ${e.n}일</span></div>`;
    }).join('') + `</div>`;
  }
  return h;
}

function viewSummary() {
  const p = PERIODS.find((x) => x.id === period);
  const list = entriesIn(p.days);
  let h = `<div class="seg">` + PERIODS.map((x) => `<button data-period="${x.id}" class="${x.id === period ? 'active' : ''}">${x.label}</button>`).join('') + `</div>`;
  h += wordCards(period);   // 일주일 · 한 달 · 일 년: 한 단어 + 그림 하나
  if (!list.length) return h + `<div class="card empty"><div class="empty-ico">${SMILE}</div>${p.text}에는 기록이 없어요.</div>`;

  h += `<div class="card"><h3 class="h-sub">${p.text} · 기록 ${list.length}일</h3>`;
  const emojis = list.slice().reverse().map((x) => moodsOf(x).join('')).filter(Boolean).join(' ');
  h += emojis ? `<div class="emoji-line">${emojis}</div>` : `<p class="desc">기분 기록이 아직 없어요.</p>`;
  h += `</div>`;

  const mc = moodCounts(list), max = Math.max(1, ...Object.values(mc));
  if (Object.keys(mc).length) {
    h += `<div class="card"><h3 class="h-sub">기분 모아보기</h3>` + MOODS.filter((m) => mc[m.e]).map((m, i) =>
      `<div class="bar-row"><span class="lab">${m.e}</span><div class="bar"><i style="width:${(mc[m.e] / max) * 100}%;background:${PAL[i % 5][1]}"></i></div><span class="num">${mc[m.e]}일</span></div>`).join('') + `</div>`;
  }
  const ws = words(list);
  if (ws.length) h += `<div class="card"><h3 class="h-sub">자주 쓴 말</h3><div class="chips">` + ws.map(([w, n], i) => `<span class="chip ${PAL[i % 4][0]}">${esc(w)}<b>${n}</b></span>`).join('') + `</div></div>`;

  const groups = {};   // 취향 모아보기: 항목별로 날짜 최신순
  list.forEach((x) => picksOf(x).forEach(([k, v]) => { (groups[k] = groups[k] || []).push({ d: x.date, v }); }));
  const gk = Object.keys(groups);
  if (gk.length) {
    h += `<div class="card"><h3 class="h-sub">오늘의 취향 모아보기</h3>` + gk.map((k) =>
      `<div class="pick-group"><h4>${esc(k)} ${groups[k].length}</h4>` + groups[k].slice(0, 10).map((g) =>
        `<div class="pick-row"><span class="pk">${niceDate(g.d).replace(/ \(.\)/, '')}</span><span class="pt">${esc(g.v)}</span></div>`).join('') + `</div>`).join('') + `</div>`;
  }

  const photos = list.filter((x) => x.photo).slice(0, 18);
  if (photos.length) h += `<div class="card"><h3 class="h-sub">사진</h3><div class="photos">` + photos.map((x) => `<img src="${x.photo}" alt="${niceDate(x.date)} 사진">`).join('') + `</div></div>`;

  h += `<div class="sec-head"><h2>날짜별 기록</h2><span class="sub-link">눌러서 고치기</span></div>`;
  h += list.map((x) => `<button class="list-item clay" data-edit="${x.date}"><div class="d">${niceDate(x.date)} ${moodsOf(x).join('')}${x.weather ? ' ' + x.weather : ''}${x.photo ? ' · 사진' : ''}</div><div class="t">${esc(x.did || (x.todos && x.todos[0] ? '해야 할 일: ' + x.todos[0].t : '(내용 없음)'))}</div></button>`).join('');
  return h;
}

function viewPattern() {
  const all = Object.values(entries);
  const list = entriesIn(30);
  if (all.length < 3) {
    return `<div class="card empty"><div class="empty-ico">${SMILE}</div>기록이 3일 이상 쌓이면<br>나의 패턴을 알려 드릴게요.<br><span class="sub">지금 ${all.length}일 기록했어요.</span></div>`;
  }
  const prevN = all.filter((x) => x.date >= daysAgoKey(59) && x.date < daysAgoKey(29)).length;
  const dd = list.length - prevN;
  let h = `<div class="card big-stat"><div class="big-n">${list.length}<small>일</small></div><p class="sub">최근 30일 동안 기록한 날</p>
    <p class="delta">${dd > 0 ? `이전 30일보다 +${dd}일` : dd < 0 ? `이전 30일보다 ${dd}일` : '이전 30일과 같아요'}</p></div>`;

  // 요일별 둥근 막대그래프 (기록한 날 수)
  const cntW = Array(7).fill(0);
  list.forEach((x) => { cntW[fromKey(x.date).getDay()]++; });
  const mx = Math.max(1, ...cntW);
  h += `<div class="sec-head"><h2>요일별 기록</h2><span class="pill-s">최근 30일</span></div><div class="card"><div class="wbars">` +
    [0, 1, 2, 3, 4, 5, 6].map((i) => `<div class="wcol"><span class="wv">${cntW[i]}</span><i class="wbar" style="height:${Math.max(10, (cntW[i] / mx) * 100)}px;background:${PAL[i % 5][1]}"></i><span class="wl">${DAYNAMES[i]}</span></div>`).join('') + `</div></div>`;

  // 기분 도넛 + 범례 5줄
  const mc = moodCounts(list);
  let rows = Object.entries(mc).sort((a, b) => b[1] - a[1]);
  if (rows.length > 5) { const rest = rows.slice(4).reduce((s, r) => s + r[1], 0); rows = rows.slice(0, 4).concat([['기타', rest]]); }
  const tot = rows.reduce((s, r) => s + r[1], 0);
  if (tot) {
    let acc = 0;
    const stops = rows.map((r, i) => { const a = (acc / tot) * 100; acc += r[1]; return `${PAL[i][1]} ${a}% ${(acc / tot) * 100}%`; }).join(', ');
    h += `<div class="sec-head"><h2>기분 모아보기</h2><span class="pill-s">최근 30일</span></div><div class="card donut-card">
      <div class="donut" style="background:conic-gradient(${stops})"><div class="d-c"><b>${tot}</b><span>번</span></div></div>
      <div class="legend">` + rows.map((r, i) => `<div class="lg"><i style="background:${PAL[i][1]}"></i><span class="lg-n">${r[0] === '기타' ? '기타' : r[0] + ' ' + esc((moodOf(r[0]) || {}).n || '')}</span><b>${r[1]}</b></div>`).join('') + `</div></div>`;
  }

  // 알게 된 점
  const sum = Array(7).fill(0), cnt = Array(7).fill(0), wsum = {}, wcnt = {};
  list.forEach((x) => {   // 그날 고른 기분들의 평균 점수를 쓴다
    const sc = moodsOf(x).map((e) => (moodOf(e) || {}).s).filter((s) => s != null);
    if (!sc.length) return;
    const v = sc.reduce((a, b) => a + b, 0) / sc.length, w = fromKey(x.date).getDay();
    sum[w] += v; cnt[w]++;
    if (x.weather) { wsum[x.weather] = (wsum[x.weather] || 0) + v; wcnt[x.weather] = (wcnt[x.weather] || 0) + 1; }
  });
  const avg = sum.map((s, i) => (cnt[i] ? s / cnt[i] : null));
  const have = avg.map((a, i) => ({ a, i })).filter((x) => x.a != null);
  const lines = [];
  if (have.length >= 2) {
    const best = have.reduce((p, c) => (c.a > p.a ? c : p)), worst = have.reduce((p, c) => (c.a < p.a ? c : p));
    if (best.a !== worst.a) {
      lines.push(`기분이 가장 좋았던 요일은 <b>${DAYNAMES[best.i]}요일</b>이에요.`);
      lines.push(`기분이 가장 가라앉았던 요일은 <b>${DAYNAMES[worst.i]}요일</b>이에요. 그날은 나를 좀 더 챙겨 주세요.`);
    }
  }
  const wk2 = Object.keys(wcnt).filter((k) => wcnt[k] >= 2).map((k) => ({ k, a: wsum[k] / wcnt[k] }));
  if (wk2.length >= 2) {
    const bw = wk2.reduce((p, c) => (c.a > p.a ? c : p)), ww = wk2.reduce((p, c) => (c.a < p.a ? c : p));
    if (bw.a !== ww.a) lines.push(`${bw.k} <b>${(weatherOf(bw.k) || {}).n || ''}</b> 날에 기분이 가장 좋았고, ${ww.k} <b>${(weatherOf(ww.k) || {}).n || ''}</b> 날에는 조금 가라앉았어요.`);
  }
  const top = Object.entries(mc).sort((a, b) => b[1] - a[1])[0];
  if (top) lines.push(`가장 자주 느낀 기분은 ${top[0]} <b>${(moodOf(top[0]) || {}).n || ''}</b> (${top[1]}일)이에요.`);
  const ws = words(list);
  if (ws.length) lines.push(`요즘 자주 쓴 말은 <b>${ws.slice(0, 3).map((x) => esc(x[0])).join(', ')}</b>이에요.`);
  const todos = list.flatMap((x) => x.todos || []);
  if (todos.length) { const r = Math.round((todos.filter((t) => t.done).length / todos.length) * 100); lines.push(r >= 70 ? '해야 할 일을 잘 끝내고 있어요.' : '끝내지 못한 해야 할 일이 꽤 있어요. 하나씩 천천히 해 봐요.'); }
  if (streak() >= 3) lines.push(`${streak()}일 연속으로 기록 중이에요. 멋져요!`);
  if (lines.length) h += `<div class="sec-head"><h2>알게 된 점</h2></div><div class="card">` + lines.map((l) => `<p class="insight">${l}</p>`).join('') + `</div>`;
  return h;
}

/* ---------- 기록 쓰는 창 ---------- */
let editKey = null, editMoods = [], editPhoto = '', editPicks = {};
function loadDay(key) {
  editKey = key;
  const en = entries[key];
  const isToday = key === todayKey();
  editMoods = en ? moodsOf(en).slice() : [];
  editPhoto = en ? en.photo || '' : '';
  $('#sheet-title').textContent = isToday ? '오늘 기록' : niceDate(key) + ' 기록';
  $('#f-did-label').textContent = isToday ? '오늘 한 일' : '그날 한 일';
  $('#f-date').value = key;
  $('#f-date').max = todayKey();
  $('#f-did').value = en ? en.did || '' : '';
  $('#f-todo').value = en ? (en.todos || []).map((t) => t.t).join('\n') : '';
  $('#f-delete').hidden = !en;
  $('#f-msg').hidden = true;
  editPicks = Object.assign({}, (en && en.picks) || {});
  drawMoods(); drawCustomList(); drawPicks(); drawKinds(); drawPhoto();
}
function drawPicks(focusKind) {
  const names = allKinds().slice();
  Object.keys(editPicks).forEach((k) => { if (!names.includes(k)) names.push(k); });   // 지워진 항목이라도 쓴 내용은 보이게
  $('#f-picks').innerHTML = `<div class="moods">` + names.map((k) =>
    `<button type="button" class="chip-btn ${k in editPicks ? 'on' : ''}" data-pick="${esc(k)}" aria-pressed="${k in editPicks}">${esc(k)}</button>`).join('') + `</div>` +
    Object.keys(editPicks).map((k) =>
      `<label class="field-label" style="margin:12px 0 4px">오늘의 ${esc(k)}</label><input type="text" class="pick-in" data-pickin="${esc(k)}" value="${esc(editPicks[k])}" maxlength="60" placeholder="제목이나 이름" autocomplete="off">`).join('');
  if (focusKind != null) { const el = [...document.querySelectorAll('.pick-in')].find((i) => i.dataset.pickin === focusKind); if (el) el.focus(); }
}
function drawKinds() {
  $('#f-kinds').innerHTML = customKinds.length
    ? '<p class="hint" style="margin:10px 0 4px">내가 추가한 항목 (✕를 누르면 목록에서 지워요)</p><div class="chips">' +
      customKinds.map((k) => `<span class="chip">${esc(k)} <button type="button" class="x-btn" data-delkind="${esc(k)}" aria-label="${esc(k)} 지우기">✕</button></span>`).join('') + '</div>'
    : '';
}
function addKind() {
  const k = $('#f-new-k').value.trim().slice(0, 10);
  if (!k) { msg('항목 이름을 적어 주세요.'); return; }
  if (allKinds().includes(k)) { msg('이미 있는 항목이에요. 목록에서 눌러 보세요.'); return; }
  const next = customKinds.concat(k);
  if (!save(KEY_KINDS, next)) { msg('저장 공간이 부족해서 추가하지 못했어요.'); return; }
  customKinds = next;
  editPicks[k] = '';
  $('#f-new-k').value = ''; msg('');
  drawPicks(k); drawKinds();
}
/* ---------- 창 열기/닫기 + 뒤로 가기 버튼 ---------- */
let ovDepth = 0, ignorePop = 0;
function pushOv() { try { history.pushState({ ov: 1 }, ''); ovDepth++; } catch (e) { /* 무시 */ } }
function popOv() { if (ovDepth > 0) { ovDepth--; ignorePop++; try { history.back(); } catch (e) { ignorePop--; } } }
function showOv(sel) { const el = $(sel); if (!el.hidden) return; el.hidden = false; pushOv(); }
function hideOv(sel) { const el = $(sel); if (el.hidden) return; el.hidden = true; popOv(); }
window.addEventListener('popstate', () => {   // 휴대폰 뒤로 가기: 가장 위에 열린 창부터 닫는다
  if (ignorePop > 0) { ignorePop--; return; }
  if (ovDepth <= 0) return;
  ovDepth--;
  for (const id of ['#confirm', '#settings', '#sheet']) {
    if (!$(id).hidden) { $(id).hidden = true; if (id === '#confirm') confirmYes = null; return; }
  }
});

function openSheet(key, auto) {
  loadDay(key);
  showOv('#sheet');
  if (!auto) { try { $('#f-did').focus({ preventScroll: true }); } catch (e) { /* 무시 */ } }   // 앱을 켤 때 저절로 열린 경우에는 키보드를 띄우지 않는다
}
function pickDate(key) {
  if (!key || key > todayKey() || key === editKey) { $('#f-date').value = editKey; return; }   // 미래 날짜는 안 됨
  loadDay(key);
}
function closeSheet() { hideOv('#sheet'); }
function drawCustomList() {
  const mine = MOODS.filter((m) => m.custom);
  $('#f-custom').innerHTML = mine.length
    ? '<p class="hint" style="margin:10px 0 4px">내가 추가한 이모지 (✕를 누르면 목록에서 지워요)</p><div class="chips">' +
      mine.map((m) => `<span class="chip">${m.e} ${esc(m.n)} <button type="button" class="x-btn" data-delmood="${m.e}" aria-label="${esc(m.n)} 지우기">✕</button></span>`).join('') + '</div>'
    : '';
}
function addMood() {
  const e = firstEmoji($('#f-new-e').value);
  const n = $('#f-new-n').value.trim().slice(0, 12) || '내 이모지';
  const s = Number($('#f-new-s').value) || 3;
  if (!e) { msg('이모지를 한 개 넣어 주세요. (휴대폰 키보드의 이모지 키를 써요)'); return; }
  if (MOODS.some((m) => m.e === e)) { msg('이미 목록에 있는 이모지예요. 목록에서 찾아 눌러 보세요.'); return; }
  MOODS.push({ e, n, s, custom: true });
  if (!saveCustom()) { MOODS.pop(); msg('저장 공간이 부족해서 추가하지 못했어요.'); return; }
  editMoods = editMoods.concat(e);
  $('#f-new-e').value = ''; $('#f-new-n').value = '';
  msg(''); drawMoods(); drawCustomList();
}
function drawMoods() {
  $('#f-moods').innerHTML = MOODS.map((m) =>
    `<button type="button" class="mood-btn ${editMoods.includes(m.e) ? 'on' : ''}" data-mood="${m.e}" aria-pressed="${editMoods.includes(m.e)}" aria-label="${m.n}" title="${m.n}">${m.e}</button>`).join('') +
    `<p class="hint" style="width:100%;margin:2px 0 0">${editMoods.length ? '고른 기분: ' + editMoods.map((e) => esc((moodOf(e) || {}).n || '')).join(' · ') : '기분을 여러 개 골라도 돼요 (다시 누르면 빼기)'}</p>`;
}
function drawPhoto() {
  const img = $('#f-photo-preview');
  img.hidden = !editPhoto;
  if (editPhoto) img.src = editPhoto;
  $('#f-photo-del').hidden = !editPhoto;
}
function msg(t) { const m = $('#f-msg'); m.textContent = t; m.hidden = !t; }

function saveEntry() {
  const did = $('#f-did').value.trim();
  const lines = $('#f-todo').value.split('\n').map((s) => s.trim()).filter(Boolean);
  const picks = {};
  Object.entries(editPicks).forEach(([k, v]) => { if (String(v).trim()) picks[k] = String(v).trim(); });
  if (!did && !editMoods.length && !lines.length && !editPhoto && !Object.keys(picks).length) { msg('내용을 한 가지라도 적어 주세요.'); return; }
  const old = entries[editKey];
  const prev = old ? old.todos || [] : [];
  const todos = lines.map((t) => ({ t, done: !!(prev.find((p) => p.t === t) || {}).done }));
  const next = Object.assign({}, entries);
  next[editKey] = { date: editKey, did, moods: editMoods.slice(), weather: (old && old.weather) || '', todos, picks, photo: editPhoto };
  if (!save(KEY_ENTRIES, next)) { msg('저장 공간이 부족해요. 사진을 빼거나 오래된 사진 기록을 지워 보세요.'); return; }
  entries = next;
  closeSheet(); render();
}

function resizePhoto(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onerror = reject;
    fr.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const max = 800, r = Math.min(1, max / Math.max(img.width, img.height));
        const cv = document.createElement('canvas');
        cv.width = Math.round(img.width * r); cv.height = Math.round(img.height * r);
        cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
        resolve(cv.toDataURL('image/jpeg', 0.7));
      };
      img.src = fr.result;
    };
    fr.readAsDataURL(file);
  });
}

/* ---------- 지우기 확인 ---------- */
let confirmYes = null;
function ask(text, yes) { $('#confirm-text').textContent = text; confirmYes = yes; showOv('#confirm'); }

/* ---------- 저녁 알림 ---------- */
function showNotice(title, body) {
  const opts = { body, icon: './icon-192.png', badge: './icon-192.png', tag: 'daily' };
  const old = () => { try { new Notification(title, opts); } catch (e) { /* 무시 */ } };
  if ('serviceWorker' in navigator) navigator.serviceWorker.ready.then((reg) => reg.showNotification(title, opts)).catch(old); else old();
}
let bannerHiddenFor = '';
function checkReminder() {
  const b = $('#banner');
  const now = new Date();
  const due = settings.on && (pad(now.getHours()) + ':' + pad(now.getMinutes())) >= settings.time;
  const need = due && !entries[todayKey()] && bannerHiddenFor !== todayKey();
  b.hidden = !need;
  if (need) {
    b.textContent = '🌙 오늘 기록할 시간이에요. 아래 큰 버튼을 눌러 주세요.';
    const flag = 'notified-' + todayKey();
    if (!sessionStorage.getItem(flag) && 'Notification' in window && Notification.permission === 'granted') {
      try { sessionStorage.setItem(flag, '1'); showNotice('오늘 안녕?', '오늘 하루를 한 줄로 남겨 볼까요?'); } catch (e) { /* 무시 */ }
    }
  }
}

/* ---------- 이벤트 ---------- */
document.addEventListener('click', (ev) => {
  const t = ev.target.closest('button, [data-act]');
  if (!t) return;
  if (t.dataset.tab) { tab = t.dataset.tab; $('#content').scrollTop = 0; animateNext = true; render(); return; }
  if (t.dataset.act === 'record') { openSheet(todayKey()); return; }
  if (t.dataset.act === 'notify' || t.dataset.act === 'wxplace') { $('#btn-settings').click(); return; }
  if (t.dataset.day) { openSheet(t.dataset.day); return; }
  if (t.dataset.quick) {   // 빠른 기록: 기록 창을 열고 해당 칸으로 바로 이동
    openSheet(todayKey());
    const target = { mood: '#f-moods', did: '#f-did', todo: '#f-todo' }[t.dataset.quick];
    setTimeout(() => { const el = $(target); el.scrollIntoView({ block: 'center' }); if (el.tagName === 'TEXTAREA') el.focus(); }, 80);
    return;
  }
  if (t.dataset.period) { period = t.dataset.period; animateNext = true; render(); return; }
  if (t.dataset.edit) { openSheet(t.dataset.edit); return; }
  if (t.dataset.delmood) {
    const e = t.dataset.delmood;
    ask('정말 지울까요? (이미 쓴 기록에는 이모지가 남아 있어요)', () => {
      const i = MOODS.findIndex((m) => m.e === e && m.custom);
      if (i >= 0) MOODS.splice(i, 1);
      saveCustom();
      editMoods = editMoods.filter((x) => x !== e);
      drawMoods(); drawCustomList();
    });
    return;
  }
  if (t.dataset.pick) {   // 오늘의 취향 항목 켜기/끄기
    const k = t.dataset.pick;
    if (k in editPicks) delete editPicks[k]; else editPicks[k] = '';
    drawPicks(k in editPicks ? k : undefined); return;
  }
  if (t.dataset.delkind) {
    const k = t.dataset.delkind;
    ask('정말 지울까요? (이미 쓴 기록에는 내용이 남아 있어요)', () => {
      customKinds = customKinds.filter((x) => x !== k);
      save(KEY_KINDS, customKinds);
      delete editPicks[k];
      drawPicks(); drawKinds();
    });
    return;
  }
  if (t.dataset.mood) {
    const e = t.dataset.mood;
    editMoods = editMoods.includes(e) ? editMoods.filter((x) => x !== e) : editMoods.concat(e);
    drawMoods(); return;
  }
});
/* ---------- 폭죽 ---------- 떠 있는 "쓰기" 버튼을 누르면 버튼 자리에서 색종이가 터지고, 위쪽에서 불꽃놀이가 한 번 더 터진다 */
const FX_COLORS = ['#EE8F73', '#F8DFA9', '#B9D3C0', '#F5BBA5', '#C9D4DE', '#3F6B5A', '#FFFFFF'];
function fireworks(x, y) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2), W = window.innerWidth, H = window.innerHeight;
  const cv = document.createElement('canvas');
  cv.className = 'fx'; cv.width = W * dpr; cv.height = H * dpr;
  document.body.appendChild(cv);
  const g = cv.getContext('2d'); g.scale(dpr, dpr);
  const rnd = (a, b) => a + Math.random() * (b - a), pick = () => FX_COLORS[Math.floor(Math.random() * FX_COLORS.length)];
  const ps = [];
  const popper = () => {   // 버튼에서 위로 터지는 색종이
    for (let i = 0; i < 46; i++) {
      const a = (-90 + rnd(-65, 65)) * Math.PI / 180, v = rnd(7, 16);
      ps.push({ k: 'c', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, w: rnd(6, 11), h: rnd(4, 7), r: rnd(0, 6), vr: rnd(-.35, .35), life: rnd(70, 105), c: pick(), grav: .34 });
    }
  };
  const burst = (bx, by) => {   // 동그랗게 퍼지는 불꽃
    const col = pick(), col2 = pick();
    for (let i = 0; i < 34; i++) {
      const a = (i / 34) * Math.PI * 2 + rnd(-.08, .08), v = rnd(3, 7.5);
      ps.push({ k: 's', x: bx, y: by, vx: Math.cos(a) * v, vy: Math.sin(a) * v, w: rnd(2.5, 4), life: rnd(42, 62), c: i % 3 ? col : col2, grav: .09 });
    }
  };
  popper();
  setTimeout(() => burst(Math.max(60, Math.min(W - 60, x - rnd(40, 110))), Math.max(90, y - rnd(170, 260))), 140);
  setTimeout(() => burst(Math.max(60, Math.min(W - 60, x + rnd(-30, 40))), Math.max(70, y - rnd(250, 340))), 300);
  let t0 = performance.now();
  (function frame(now) {
    g.clearRect(0, 0, W, H);
    let alive = 0;
    ps.forEach((p) => {
      if (p.life <= 0) return;
      alive++;
      p.life--; p.vx *= p.k === 'c' ? .985 : .96; p.vy = p.vy * (p.k === 'c' ? .985 : .96) + p.grav; p.x += p.vx; p.y += p.vy; p.r = (p.r || 0) + (p.vr || 0);
      g.globalAlpha = Math.max(0, Math.min(1, p.life / 28));
      g.fillStyle = p.c;
      if (p.k === 'c') { g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); g.restore(); }
      else { g.beginPath(); g.arc(p.x, p.y, p.w * Math.max(.3, p.life / 60), 0, Math.PI * 2); g.fill(); }
    });
    if ((alive || now - t0 < 450) && now - t0 < 3000) requestAnimationFrame(frame); else cv.remove();
  })(t0);
}
let openingFromFab = false;
$('#btn-record').addEventListener('click', () => {
  if (openingFromFab) return;
  openingFromFab = true;
  const r = $('#btn-record').getBoundingClientRect();
  fireworks(r.left + r.width / 2, r.top + r.height / 2);
  try { if (navigator.vibrate) navigator.vibrate([12, 40, 18]); } catch (e) { /* 무시 */ }
  setTimeout(() => { openingFromFab = false; openSheet(todayKey()); }, 450);   // 폭죽이 터지는 걸 보고 나서 기록 창이 열린다
});
$('#btn-plus').addEventListener('click', () => openSheet(todayKey()));
document.addEventListener('keydown', (e) => {   // 큰 카드를 키보드로도 열 수 있게
  const el = e.target.closest && e.target.closest('[data-act]');
  if (el && el.tagName !== 'BUTTON' && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); el.click(); }
});
$('#sheet-close').addEventListener('click', closeSheet);
$('#sheet').addEventListener('click', (e) => { if (e.target.id === 'sheet') closeSheet(); });
$('#f-save').addEventListener('click', saveEntry);
$('#f-mood-add').addEventListener('click', () => { const p = $('#f-mood-panel'); p.hidden = !p.hidden; if (!p.hidden) $('#f-new-e').focus(); });
$('#f-new-add').addEventListener('click', addMood);
$('#f-pick-add').addEventListener('click', () => { const p = $('#f-pick-panel'); p.hidden = !p.hidden; if (!p.hidden) $('#f-new-k').focus(); });
$('#f-new-k-add').addEventListener('click', addKind);
$('#f-picks').addEventListener('input', (e) => { const k = e.target.dataset.pickin; if (k != null) editPicks[k] = e.target.value; });
$('#f-date').addEventListener('change', (e) => pickDate(e.target.value));
$('#f-today').addEventListener('click', () => pickDate(todayKey()));
$('#f-yest').addEventListener('click', () => pickDate(daysAgoKey(1)));
$('#f-photo').addEventListener('change', async (e) => {
  const f = e.target.files[0]; e.target.value = '';
  if (!f) return;
  try { editPhoto = await resizePhoto(f); msg(''); drawPhoto(); } catch (err) { msg('사진을 불러오지 못했어요. 다른 사진으로 해 보세요.'); }
});
$('#f-photo-del').addEventListener('click', () => { editPhoto = ''; drawPhoto(); });
$('#f-delete').addEventListener('click', () => {
  ask('정말 지울까요?', () => {
    const next = Object.assign({}, entries); delete next[editKey];
    if (save(KEY_ENTRIES, next)) { entries = next; closeSheet(); render(); checkReminder(); }
  });
});
$('#confirm-no').addEventListener('click', () => { hideOv('#confirm'); confirmYes = null; });
$('#confirm-yes').addEventListener('click', () => { hideOv('#confirm'); const f = confirmYes; confirmYes = null; if (f) f(); });

$('#content').addEventListener('change', (e) => {
  const i = e.target.dataset.todo;
  if (i == null) return;
  const en = entries[todayKey()];
  if (!en) return;
  const next = Object.assign({}, entries);
  next[en.date] = Object.assign({}, en, { todos: en.todos.map((t, k) => (k === Number(i) ? { t: t.t, done: e.target.checked } : t)) });
  if (save(KEY_ENTRIES, next)) entries = next;
  render();
});

function fillPlaces() {
  const p = getPlace();
  $('#s-place').innerHTML = (p.name === '현재 위치' ? '<option value="gps">현재 위치</option>' : '') +
    PLACES.map((x, i) => `<option value="${i}">${x[0]}</option>`).join('');
  $('#s-place').value = p.name === '현재 위치' ? 'gps' : String(Math.max(0, PLACES.findIndex((x) => x[0] === p.name)));
}
$('#btn-settings').addEventListener('click', () => {
  $('#s-time').value = settings.time; $('#s-on').checked = !!settings.on; fillPlaces(); fillInstall(); $('#s-msg').hidden = true; showOv('#settings');
});
$('#s-gps').addEventListener('click', () => {
  const m = $('#s-msg'); m.hidden = false;
  if (!navigator.geolocation) { m.textContent = '이 휴대폰에서는 내 위치를 쓸 수 없어요. 도시를 골라 주세요.'; return; }
  m.textContent = '위치를 찾는 중이에요…';
  navigator.geolocation.getCurrentPosition((pos) => {
    settings = Object.assign({}, settings, { place: { name: '현재 위치', lat: Math.round(pos.coords.latitude * 100) / 100, lon: Math.round(pos.coords.longitude * 100) / 100 } });   // 소수 둘째 자리까지만 쓴다
    save(KEY_SETTINGS, settings); fillPlaces(); m.textContent = '내 위치로 정했어요. 저장을 누르면 날씨가 바뀌어요.';
  }, () => { m.textContent = '위치를 가져오지 못했어요. 위치 허용을 확인하거나 도시를 골라 주세요.'; }, { timeout: 10000 });
});
$('#settings-close').addEventListener('click', () => { hideOv('#settings'); });
$('#s-save').addEventListener('click', async () => {
  const sel = $('#s-place').value;
  const place = sel === 'gps' ? getPlace() : { name: PLACES[Number(sel)][0], lat: PLACES[Number(sel)][1], lon: PLACES[Number(sel)][2] };
  settings = Object.assign({}, settings, { on: $('#s-on').checked, time: $('#s-time').value || '21:00', place });
  save(KEY_SETTINGS, settings);
  loadWeather(true);
  if (settings.on && 'Notification' in window && Notification.permission === 'default') {
    try { await Notification.requestPermission(); } catch (e) { /* 무시 */ }
  }
  hideOv('#settings'); checkReminder();
});
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (!$('#confirm').hidden) { hideOv('#confirm'); confirmYes = null; }
  else if (!$('#sheet').hidden) closeSheet();
  else if (!$('#settings').hidden) hideOv('#settings');
});
$('#banner').addEventListener('click', () => { bannerHiddenFor = todayKey(); checkReminder(); });
document.addEventListener('visibilitychange', () => { if (!document.hidden) { render(); checkReminder(); loadWeather(false); } });
setInterval(checkReminder, 60000);

/* ---------- 휴대폰 최적화 ---------- */
// 키보드가 올라와도 창이 가려지지 않게: 보이는 영역(visualViewport)에 맞춘다 (아이폰 · 안드로이드 공통)
function syncViewport() {
  const vv = window.visualViewport;
  if (!vv) return;
  const root = document.documentElement.style;
  root.setProperty('--vvh', vv.height + 'px');
  root.setProperty('--vvt', vv.offsetTop + 'px');
  const el = document.activeElement;
  if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) && el.closest('.sheet')) setTimeout(() => { try { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) { /* 무시 */ } }, 80);
}
if (window.visualViewport) { visualViewport.addEventListener('resize', syncViewport); visualViewport.addEventListener('scroll', syncViewport); syncViewport(); }

// 홈 화면에 설치 안내 (아이폰은 사파리 안내, 안드로이드는 설치 버튼)
let deferredInstall = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredInstall = e; });
window.addEventListener('appinstalled', () => { deferredInstall = null; });
function fillInstall() {
  const box = $('#s-install');
  const standalone = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone;
  if (standalone) { box.hidden = true; return; }
  box.hidden = false;
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  $('#s-install-text').textContent = ios ? '사파리 아래쪽의 공유 버튼(네모에서 화살표가 나온 모양)을 누르고 "홈 화면에 추가"를 눌러요.'
    : deferredInstall ? '아래 버튼을 누르면 홈 화면에 앱으로 설치돼요.' : '크롬 오른쪽 위 메뉴(⋮)에서 "홈 화면에 추가" 또는 "앱 설치"를 눌러요.';
  $('#s-install-btn').hidden = ios || !deferredInstall;
}
$('#s-install-btn').addEventListener('click', async () => {
  if (!deferredInstall) return;
  deferredInstall.prompt();
  try { await deferredInstall.userChoice; } catch (e) { /* 무시 */ }
  deferredInstall = null; fillInstall();
});

// 기록이 브라우저에 의해 저절로 지워지지 않도록 저장 공간을 보호해 달라고 요청한다 (가능한 기기에서만)
try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { /* 무시 */ }

/* ---------- 시작 ---------- */
render();
checkReminder();
loadWeather(false);
openSheet(todayKey(), true);   // 앱을 켜면 바로 오늘 기록 창을 연다

if ('serviceWorker' in navigator) {
  const had = !!navigator.serviceWorker.controller;
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (had && !reloaded) { reloaded = true; location.reload(); }   // 새 버전이 적용되면 한 번만 새로고침
  });
  window.addEventListener('load', () => { navigator.serviceWorker.register('./sw.js').catch(() => {}); });
}
