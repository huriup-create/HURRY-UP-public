/* =========================================================
   허리업 (HURRY UP) — Website v3
   - 모든 데이터(센서 배열, 자세 프리셋, 하드웨어 사양, 앱 탭)는
     이 파일 상단에서만 수정하면 화면 전체에 반영됩니다.
   - GSAP / ScrollTrigger / Lenis 로드에 실패해도 콘텐츠와 기능은 그대로 동작합니다.
   ========================================================= */

// ---------------------------------------------------------
// 0. 환경 / 설정
// ---------------------------------------------------------
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const hasGSAP = () => typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
let lenis = null;

// 사이트 설정은 site-config.js 한 곳에서 관리합니다 (없으면 안전한 기본값).
const CFG = window.HURRYUP_CONFIG || {};
const CONTACT = { endpoint: '', format: 'json', extraFields: {}, subject: '', minFillSeconds: 4, cooldownSeconds: 60, timeoutMs: 15000, turnstileSiteKey: '', ...(CFG.contact || {}) };
const PRIVACY = { controller: '', contactEmail: '', retention: '', processor: '', ...(CFG.privacy || {}) };
/**
 * 문의 폼 전송 주소 (site-config.js → contact.endpoint).
 * 개인정보 안내(처리 주체 · 연락처 · 보유 기간)가 채워지지 않았으면 전송을 활성화하지 않습니다.
 * 비어 있으면 폼은 내용을 전송하지 않고, 전송되지 않았다는 사실을 그대로 안내합니다.
 */
const PRIVACY_READY = !!(PRIVACY.controller && PRIVACY.contactEmail && PRIVACY.retention);
const CONTACT_ENDPOINT = CONTACT.endpoint && PRIVACY_READY ? CONTACT.endpoint : '';
if (CONTACT.endpoint && !PRIVACY_READY) console.warn('[HURRY UP] contact.endpoint가 설정됐지만 privacy(controller · contactEmail · retention)가 비어 있어 전송을 비활성화했습니다.');

// 사양 조회: '확정'은 근거 문서(confirmedBy)가 있을 때만 인정
const SPECS = CFG.specs || {};
function spec(key) {
    const s = { label: key, value: '미확정', status: '미확정', ...(SPECS[key] || {}) };
    if (s.status === '확정' && !String(s.confirmedBy || '').trim()) {
        console.warn(`[HURRY UP] 사양 '${key}'이 '확정'이지만 confirmedBy(근거 문서)가 없어 '미확정'으로 표시합니다.`);
        s.status = '미확정';
    }
    return s;
}
const specRow = (key, labelOverride) => { const s = spec(key); return { label: labelOverride || s.label, val: s.value }; };

const $ = (id) => document.getElementById(id);
const icon = (name, cls = '') => `<svg class="icon ${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`;

// ---------------------------------------------------------
// 1. 센서 배열 (콘셉트)
//    ⚠ 최종 센서 수는 미확정입니다. 아래 배열에 항목을 추가/삭제하면
//      시뮬레이션·분해도·앱 미니맵·갤러리 다이어그램·[data-sensor-count] 문구가
//      모두 자동으로 갱신됩니다. (x, y: 방석 탑뷰 기준 %)
// ---------------------------------------------------------
const SENSOR_MAP = [
    { id: "S1", name: "좌측 후방 외측", x: 26, y: 72, group: "left", zone: "rear" },
    { id: "S2", name: "좌측 후방 중심", x: 36, y: 76, group: "left", zone: "rear" },
    { id: "S3", name: "좌측 후방 내측", x: 44, y: 68, group: "left", zone: "rear" },
    { id: "S4", name: "우측 후방 내측", x: 56, y: 68, group: "right", zone: "rear" },
    { id: "S5", name: "우측 후방 중심", x: 64, y: 76, group: "right", zone: "rear" },
    { id: "S6", name: "우측 후방 외측", x: 74, y: 72, group: "right", zone: "rear" },
    { id: "S7", name: "좌측 전방 외측", x: 24, y: 44, group: "left", zone: "front" },
    { id: "S8", name: "좌측 전방 중심", x: 34, y: 52, group: "left", zone: "front" },
    { id: "S9", name: "좌측 전방 내측", x: 43, y: 42, group: "left", zone: "front" },
    { id: "S10", name: "우측 전방 내측", x: 57, y: 42, group: "right", zone: "front" },
    { id: "S11", name: "우측 전방 중심", x: 66, y: 52, group: "right", zone: "front" },
    { id: "S12", name: "우측 전방 외측", x: 76, y: 44, group: "right", zone: "front" }
];

// 자세별 시뮬레이션 프리셋 (모든 값은 예시 데이터)
// ※ 좌석 압력만으로 측정할 수 없는 목·척추 상태는 표현하지 않습니다.
const POSTURE_PRESETS = {
    balanced: {
        label: "균형 착석",
        badgeClass: "badge-balanced", badgeIcon: "shield-check", badgeText: "균형 유지",
        hapticStatus: "대기", hapticClass: "haptic-normal", hapticActive: false,
        ripple: { x: 50, y: 70 },
        appVerdict: "좌우 하중이 고르게 나뉘어 있어요.",
        tipText: "좌우 하중이 고르게 나뉘어 있습니다.",
        values: { S1: 42, S2: 55, S3: 45, S4: 45, S5: 55, S6: 42, S7: 28, S8: 34, S9: 30, S10: 30, S11: 34, S12: 28 }
    },
    left_tilt: {
        label: "왼쪽 쏠림",
        badgeClass: "badge-alert", badgeIcon: "triangle-alert", badgeText: "좌측 쏠림 감지",
        hapticStatus: "작동 (좌측 알림)", hapticClass: "haptic-alert", hapticActive: true,
        ripple: { x: 35, y: 68 },
        appVerdict: "왼쪽으로 하중이 쏠려 있어요.",
        tipText: "하중의 대부분이 왼쪽에 실려 있습니다. 일정 시간 이어지면 진동으로 알립니다.",
        values: { S1: 82, S2: 95, S3: 86, S4: 24, S5: 20, S6: 18, S7: 68, S8: 72, S9: 60, S10: 16, S11: 18, S12: 12 }
    },
    right_tilt: {
        label: "오른쪽 쏠림",
        badgeClass: "badge-alert", badgeIcon: "triangle-alert", badgeText: "우측 쏠림 감지",
        hapticStatus: "작동 (우측 알림)", hapticClass: "haptic-alert", hapticActive: true,
        ripple: { x: 65, y: 68 },
        appVerdict: "오른쪽으로 하중이 쏠려 있어요.",
        tipText: "하중의 대부분이 오른쪽에 실려 있습니다. 진동 알림이 작동하는 상황입니다.",
        values: { S1: 18, S2: 22, S3: 20, S4: 85, S5: 96, S6: 86, S7: 15, S8: 18, S9: 14, S10: 64, S11: 76, S12: 70 }
    },
    forward_lean: {
        label: "앞쪽 쏠림",
        badgeClass: "badge-warning", badgeIcon: "circle-alert", badgeText: "앞쪽 쏠림 감지",
        hapticStatus: "작동 (앞쪽 쏠림 알림)", hapticClass: "haptic-alert", hapticActive: true,
        ripple: { x: 50, y: 46 },
        appVerdict: "체중이 허벅지 쪽으로 쏠려 있어요.",
        tipText: "허벅지 쪽 압력이 높아졌습니다. 체중이 앞으로 쏠린 상태입니다.",
        values: { S1: 20, S2: 25, S3: 22, S4: 22, S5: 26, S6: 20, S7: 78, S8: 88, S9: 80, S10: 80, S11: 89, S12: 79 }
    }
};

// 압력 → 색상 (범례와 같은 연속 스케일)
const HEAT_STOPS = [[0, [47, 107, 255]], [35, [20, 184, 166]], [65, [245, 165, 36]], [100, [255, 77, 79]]];
function getPressureColor(val) {
    const v = Math.max(0, Math.min(100, val || 0));
    for (let i = 1; i < HEAT_STOPS.length; i++) {
        const [p1, c1] = HEAT_STOPS[i - 1], [p2, c2] = HEAT_STOPS[i];
        if (v <= p2) {
            const t = (v - p1) / (p2 - p1);
            const c = c1.map((ch, k) => Math.round(ch + (c2[k] - ch) * t));
            return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
        }
    }
    return 'rgb(255, 77, 79)';
}

// 하중 값에서 파생되는 수치 (센서 수가 바뀌어도 자동 계산)
function metricsOf(values) {
    let left = 0, right = 0, front = 0, sum = 0, peak = null;
    SENSOR_MAP.forEach(s => {
        const v = values[s.id] ?? 0;
        sum += v;
        if (s.group === 'left') left += v; else right += v;
        if (s.zone === 'front') front += v;
        if (!peak || v > peak.v) peak = { id: s.id, v };
    });
    const total = left + right || 1;
    const leftRatio = Math.round(left / total * 100), frontRatio = Math.round(front / total * 100);
    return {
        leftRatio, rightRatio: 100 - leftRatio, frontRatio, rearRatio: 100 - frontRatio,
        avg: Math.round(sum / (SENSOR_MAP.length || 1)),
        peak: peak ? `${peak.id} (${Math.round(peak.v)}%)` : '—'
    };
}

// SENSOR_MAP 기반 점 렌더링 (여러 곳에서 공용)
function renderSensorDots(container, className = 'sd-dot') {
    if (!container) return [];
    return SENSOR_MAP.map((s, i) => {
        const dot = document.createElement('span');
        dot.className = className;
        dot.style.left = `${s.x}%`;
        dot.style.top = `${s.y}%`;
        dot.style.setProperty('--d', `${(i % 6) * 0.18}s`);
        dot.dataset.sensor = s.id;
        container.appendChild(dot);
        return dot;
    });
}

function paintDots(container, values) {
    if (!container) return;
    container.querySelectorAll('[data-sensor]').forEach(dot => {
        dot.style.setProperty('--c', getPressureColor(values[dot.dataset.sensor]));
    });
}

// ---------------------------------------------------------
// 2. 체압 체험 — 하나의 압력 엔진 (예시 데이터)
//   자세 버튼(프리셋) 또는 도판 위 커서(데스크톱)가 '목표 하중'을 정하고,
//   12점 값은 1차 감쇠(타우 260ms)로 따라갑니다. 탑뷰 · 렌더 기울기 · 좌우/앞뒤 수치 ·
//   편향 추이 · 진동 알림 · 비교 모드 · 앱 실시간 탭이 모두 같은 값을 읽습니다.
//   ※ 실제 측정값이 아닙니다. 판정 기준(12%p · 1.5초)도 시연용 예시입니다.
// ---------------------------------------------------------
const SIM_FB = { biasOn: 12, biasOff: 7, holdMs: 1500 };   // 편향(%p) · 해제 · 알림까지 지속(ms), 시연용
const SIM_ZONES = [
    { label: '좌측 후방', f: s => s.group === 'left' && s.zone === 'rear' },
    { label: '우측 후방', f: s => s.group === 'right' && s.zone === 'rear' },
    { label: '좌측 전방', f: s => s.group === 'left' && s.zone === 'front' },
    { label: '우측 전방', f: s => s.group === 'right' && s.zone === 'front' }
];
const BASE_FRONT = metricsOf(POSTURE_PRESETS.balanced.values).frontRatio;
let currentPosture = 'balanced';
let compareMode = false;
let sim = null;                                                 // initPressureSimulation()이 채움

// 현재 하중을 자세로 분류 (판정 문구 · 팁 · 알림 위치에 사용)
function classifyPosture(m) {
    const lr = m.rightRatio - 50;
    if (Math.abs(lr) >= SIM_FB.biasOn) return lr > 0 ? 'right_tilt' : 'left_tilt';
    if (m.frontRatio - BASE_FRONT >= SIM_FB.biasOn) return 'forward_lean';
    return 'balanced';
}

function initPressureSimulation() {
    const demo = $('simulation'), field = $('demoField'), nodesWrap = $('demoNodes');
    if (!demo || !field || !nodesWrap) return;
    const P = POSTURE_PRESETS, ids = SENSOR_MAP.map(s => s.id), base = P.balanced.values;
    const cur = { ...base };
    let target = { ...base };

    // 12점 노드: 값 · 비교 모드 변화량. 누르면 해당 센서의 현재 예시 값을 안내
    const nodes = SENSOR_MAP.map(s => {
        const el = document.createElement('button');
        el.type = 'button'; el.className = 'dm-node';
        el.style.left = `${s.x}%`; el.style.top = `${s.y}%`;
        el.innerHTML = '<i class="dm-dot" aria-hidden="true"></i><span class="dm-val pe-mono">0</span><span class="dm-delta pe-mono"></span>';
        el.addEventListener('click', () => showToast(`${s.id} · ${s.name} — 예시 값 ${Math.round(cur[s.id])}%`, 'info'));
        nodesWrap.appendChild(el);
        return { s, el, val: el.querySelector('.dm-val'), delta: el.querySelector('.dm-delta'), last: -1 };
    });
    renderSensorDots($('cmpBaseMap'), 'dm-mini-dot');
    paintDots($('cmpBaseMap'), base);

    const plate = $('demoPlate'), ripple = $('hapticRipple');
    const out = {
        L: $('leftBalanceVal'), R: $('rightBalanceVal'), gauge: $('balanceGaugeMark'), fr: $('frontRearVal'),
        avg: $('avgPressureVal'), peak: $('peakSensorVal'), status: $('simStatus'), tip: $('simTipText'),
        bias: $('simBias'), trace: $('simTraceLine'), fb: $('simFeedback'), fbText: $('simFbText'), hold: $('simHold')
    };
    const MAX_BIAS = (metricsOf(P.right_tilt.values).rightRatio - 50) || 32;
    const trace = new Array(120).fill(0);                       // 최근 12초, 100ms 간격
    let lastSample = 0, biasSince = 0, alerting = false, recoveredAt = 0, shownKey = '', lastSync = 0, prev = {};
    const fmt = (ms) => { const s = ms / 1000; return `${String(Math.floor(s / 60)).padStart(2, '0')}:${(s % 60).toFixed(1).padStart(4, '0')}`; };
    const setText = (el, key, text) => { if (el && prev[key] !== text) { el.textContent = text; prev[key] = text; } };

    function paint(now) {
        const m = metricsOf(cur);
        nodes.forEach(n => {
            const v = cur[n.s.id], r = Math.round(v);
            if (r === n.last) return;
            n.last = r;
            n.el.style.setProperty('--c', getPressureColor(v));
            n.el.style.setProperty('--s', (0.6 + v / 120).toFixed(3));
            n.val.textContent = r;
            const d = r - base[n.s.id];
            n.delta.textContent = d === 0 ? '±0' : `${d > 0 ? '+' : ''}${d}`;
            n.el.setAttribute('aria-label', `${n.s.id} ${n.s.name}, 예시 압력 ${r}%${compareMode ? `, 균형 대비 ${d > 0 ? '+' : ''}${d}` : ''}`);
        });
        setText(out.L, 'L', String(m.leftRatio)); setText(out.R, 'R', String(m.rightRatio));
        out.gauge?.style.setProperty('--g', `${m.rightRatio}%`);
        setText(out.fr, 'fr', `${m.frontRatio} : ${m.rearRatio}`);
        setText(out.avg, 'avg', `${m.avg}%`); setText(out.peak, 'peak', m.peak);
        plate?.style.setProperty('--pe-load', Math.max(-1, Math.min(1, (m.rightRatio - 50) / MAX_BIAS)).toFixed(3));

        const key = classifyPosture(m), p = P[key];
        if (key !== shownKey) {
            shownKey = key;
            setText(out.status, 'status', p.badgeText); setText(out.tip, 'tip', p.tipText);
            ripple?.style.setProperty('--rx', `${p.ripple.x}%`); ripple?.style.setProperty('--ry', `${p.ripple.y}%`);
        }

        // 진동 알림: 편향이 일정 시간 이어질 때만 작동, 고르게 돌아오면 멈춤
        const signed = m.rightRatio - 50;
        const bias = Math.max(Math.abs(signed), m.frontRatio - BASE_FRONT);
        const dir = key === 'forward_lean' ? '앞쪽' : signed > 0 ? '우측' : '좌측';
        setText(out.bias, 'bias', signed === 0 ? '0' : `${signed > 0 ? 'R' : 'L'} ${Math.abs(signed)}%p`);
        let state = out.fb.dataset.state;
        if (bias >= SIM_FB.biasOn) {
            if (!biasSince) biasSince = now;
            const held = now - biasSince;
            setText(out.hold, 'hold', fmt(held));
            if (!alerting && held >= SIM_FB.holdMs) alerting = true;
            if (alerting) { state = 'alert'; setText(out.fbText, 'fb', `진동 알림 · 작동 (${dir})`); }
            else { state = 'bias'; setText(out.fbText, 'fb', `${dir} 편향 · 판정 중`); }
        } else if (bias <= SIM_FB.biasOff) {
            if (alerting || biasSince) recoveredAt = now;
            biasSince = 0; alerting = false; setText(out.hold, 'hold', fmt(0));
            if (recoveredAt && now - recoveredAt < 1400) { state = 'recovered'; setText(out.fbText, 'fb', '균형 회복 · 알림 종료'); }
            else { state = 'idle'; setText(out.fbText, 'fb', '진동 알림 · 대기'); }
        }
        out.fb.dataset.state = state;
        field.toggleAttribute('data-alert', state === 'alert');

        if (out.trace && now - lastSample >= 100) {
            lastSample = now; trace.shift(); trace.push(signed);
            out.trace.setAttribute('points', trace.map((v, i) => `${(i * 240 / 119).toFixed(1)},${(32 - v * (30 / 40)).toFixed(1)}`).join(' '));
        }
        if (now - lastSync >= 150) {
            lastSync = now;
            syncAppLiveView(cur, m, p);
            if (compareMode) renderComparison(cur, p);
        }
    }

    // 응답 · 안착: 1차 감쇠(타우 260ms). 화면에 보일 때만 갱신 (편향 추이는 시간 축이라 계속 흐름)
    let last = performance.now(), raf = 0, running = false;
    const step = (now) => {
        const dt = Math.min(64, now - last); last = now;
        const k = prefersReducedMotion ? 1 : 1 - Math.exp(-dt / 260);
        ids.forEach(id => { cur[id] += (target[id] - cur[id]) * k; });
        paint(now);
        raf = running ? requestAnimationFrame(step) : 0;
    };
    const start = () => { if (running) return; running = true; last = performance.now(); raf = requestAnimationFrame(step); };
    const stop = () => { running = false; cancelAnimationFrame(raf); raf = 0; };
    let inView = false;
    new IntersectionObserver(([e]) => { inView = e.isIntersecting; inView && !document.hidden ? start() : stop(); }).observe(demo);
    document.addEventListener('visibilitychange', () => { document.hidden ? stop() : inView && start(); });

    // 데스크톱: 도판 위 커서 위치가 좌우 하중을 옮김 (떠나면 선택한 자세로 돌아감)
    const blendLR = (t) => {
        const side = t >= 0 ? P.right_tilt.values : P.left_tilt.values, k = Math.min(1, Math.abs(t)), o = {};
        ids.forEach(id => { o[id] = base[id] + (side[id] - base[id]) * k; });
        return o;
    };
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches && plate) {
        plate.addEventListener('pointermove', (e) => {
            const r = plate.getBoundingClientRect();
            target = blendLR(Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width - 0.5) * 2.4)));
            start();
        });
        plate.addEventListener('pointerleave', () => { target = { ...P[currentPosture].values }; start(); });
    }

    demo.querySelectorAll('[data-posture]').forEach(btn => btn.addEventListener('click', () => changePostureSimulation(btn.dataset.posture)));
    const toggle = $('compareToggle');
    toggle?.addEventListener('click', () => {
        compareMode = !compareMode;
        toggle.setAttribute('aria-pressed', compareMode);
        $('comparePanel').hidden = !compareMode;
        demo.toggleAttribute('data-compare', compareMode);
        nodes.forEach(n => { n.last = -1; });                  // 노드 라벨(변화량 포함) 다시 쓰기
        renderComparison(cur, P[classifyPosture(metricsOf(cur))]);
        paint(performance.now());
    });

    // 진동 알림이 화면에 있는 동안 '맨 위로' 버튼은 비켜 섬 (휴대폰에서 알림 상태 · 지속 시간을 가리지 않게)
    const topBtn = $('scrollTop');
    if (topBtn && out.fb) new IntersectionObserver(([e]) => topBtn.classList.toggle('is-yielding', e.isIntersecting)).observe(out.fb);

    sim = { setPreset(key) { target = { ...P[key].values }; start(); } };
    paint(performance.now());
}

function changePostureSimulation(postureKey) {
    if (!POSTURE_PRESETS[postureKey]) return;
    currentPosture = postureKey;
    document.querySelectorAll('.dm-posture').forEach(btn => btn.setAttribute('aria-pressed', btn.dataset.posture === postureKey));
    sim?.setPreset(postureKey);
}

// 비교 모드: 균형 착석 대비 구역별 평균
function renderComparison(values, p) {
    const label = $('cmpCurLabel'); if (label) label.textContent = `현재 · ${p.label}`;
    const avg = (vals, f) => {
        const list = SENSOR_MAP.filter(f);
        return list.length ? Math.round(list.reduce((a, s) => a + (vals[s.id] ?? 0), 0) / list.length) : 0;
    };
    const box = $('zoneDeltas'); if (!box) return;
    box.innerHTML = SIM_ZONES.map(z => {
        const b = avg(POSTURE_PRESETS.balanced.values, z.f), c = avg(values, z.f), d = c - b;
        return `<div class="zone-row"><span>${z.label}</span><div class="zone-bar" aria-hidden="true"><i class="cur" style="width:${c}%; --c:${getPressureColor(c)}"></i><i class="base" style="left:${b}%"></i></div><b>${d > 0 ? '+' : ''}${d}</b></div>`;
    }).join('');
}

// 앱 미리보기 › 실시간 탭: 체험 데모와 같은 값
function syncAppLiveView(values, m, p) {
    paintDots($('appMiniMap'), values);
    const L = $('appLiveLeft'), R = $('appLiveRight'), verdict = $('appLiveVerdict');
    if (L) L.textContent = `${m.leftRatio}%`;
    if (R) R.textContent = `${m.rightRatio}%`;
    if (verdict) verdict.textContent = p.appVerdict;
}

// ---------------------------------------------------------
// 3. 하드웨어 구성 (시제품 단계)
//    ⚠ 사양 값은 site-config.js → specs 에서만 수정합니다 (여기는 문구 · 구성만).
//    · 화면에는 의미 있는 정보만: 자료 간 상충하거나 측정되지 않은 수치(규격 · 센서 수 · IC · MCU 후보 ·
//      배터리 용량 · 사용 시간 · 소음 목표 · 인증)는 표시하지 않습니다. 확정되면 site-config.js에서
//      status '확정' + confirmedBy(근거 문서)를 채운 뒤 아래 표에 행을 추가하세요.
//    · 단계 안내는 섹션 공지 한 줄에서만 합니다 (행마다 '검토 중' 등을 반복하지 않음).
// ---------------------------------------------------------
const HARDWARE_PARTS = {
    cover_foam: {
        tag: "외피 · 폼",
        title: "인체공학 폼과 분리형 커버",
        desc: "엉덩이와 허벅지를 받치는 굴곡 폼과 통기성 커버로 구성합니다.",
        table: [specRow('foamMaterial'), specRow('cover')]
    },
    sensor_array: {
        tag: "센싱",
        title: "압력센서 레이어",
        desc: "얇은 압력 센서로 엉덩이와 허벅지 쪽 하중 변화를 읽습니다. 작동하는 MVP 시제품에는 FSR 압력 센서를 썼습니다.",
        table: [specRow('sensorType'), { label: "웹 데모", val: `${SENSOR_MAP.length}점 콘셉트 배열 (시연용)` }]
    },
    haptic_motor: {
        tag: "액추에이터",
        title: "저소음 진동 모터",
        desc: "쏠림이 이어지면 앉은 사람만 느낄 수 있는 짧은 진동을 보냅니다.",
        table: [specRow('motor')]
    },
    main_pcb: {
        tag: "컨트롤러",
        title: "메인 제어 보드",
        desc: "센서 신호를 읽고 쏠림을 판정해 진동을 제어합니다. 첫 화면 분해도에서는 보드 형상을 단순화했습니다.",
        table: [{ label: "동작", val: "방석이 단독으로 판정하고 진동하도록 설계" }]
    },
    ble_module: {
        tag: "무선 통신",
        title: "BLE 통신",
        desc: "착석 기록을 스마트폰 앱으로 보냅니다.",
        table: [specRow('bleSpec'), { label: "앱", val: `${spec('appPlatform').value} · 개발 중` }]
    },
    battery_power: {
        tag: "전원",
        title: "충전식 배터리와 전원부",
        desc: "USB-C로 충전하는 내장 배터리로 설계하고 있습니다.",
        table: [specRow('charging')]
    }
};

// 부품별 사양 목록 (#hwSpecs). 레이어 구조 · 배치(분해도)는 첫 화면 3D 시퀀스(cinematic.js)가 같은 순서로 보여 줍니다.
//   ※ 예전 2D 분해도 그림(HW_LAYER_ART)의 부품 좌표는 cinematic.js의 레이어 형상으로 옮겼습니다.
const HARDWARE_ORDER = { cover_foam: '폼 · 외피 커버', sensor_array: '압력센서 레이어', haptic_motor: '진동 모터', main_pcb: '메인 제어 보드', ble_module: 'BLE 통신', battery_power: '배터리 · 전원' };

function renderHardwareSpecs() {
    const list = $('hwSpecs');
    if (!list) return;
    list.innerHTML = Object.entries(HARDWARE_ORDER).map(([key, name], i) => {
        const d = HARDWARE_PARTS[key];
        const rows = d.table.map(r => `<tr><th scope="row">${r.label}</th><td>${r.val}</td></tr>`).join('');
        return `<li class="spec-card hw-spec" data-part="${key}">
            <p class="hw-spec-layer"><span class="hw-spec-num">${String(i + 1).padStart(2, '0')}</span>${name}</p>
            <span class="spec-tag">${d.tag}</span>
            <h3>${d.title}</h3>
            <p class="spec-desc">${d.desc}</p>
            <table class="spec-table"><tbody>${rows}</tbody></table>
        </li>`;
    }).join('');
}

// ---------------------------------------------------------
// 4. 앱 미리보기
// ---------------------------------------------------------
const APP_TAB_INFO = {
    home: {
        title: "한눈에 보는 오늘의 자세",
        desc: "착석 시간과 균형 유지율을 점수로 보여 줍니다.",
        features: ["일간 자세 점수", "착석 시간 · 휴식 알림", "방석 연결 상태"]
    },
    live: {
        title: "지금 이 순간의 체압 분포",
        desc: "좌우 균형과 압력 분포를 실시간으로 봅니다. 위 시뮬레이션과 연동됩니다.",
        features: ["압력 히트맵 미니뷰", "좌 · 우 하중 비율", "쏠림 경고"]
    },
    report: {
        title: "데이터로 보는 한 주의 습관",
        desc: "요일별 균형 유지율과 자주 나온 쏠림을 정리해 줍니다.",
        features: ["요일별 균형 유지율", "자주 감지된 쏠림 유형", "주간 변화 추이"]
    },
    settings: {
        title: "내 몸에 맞춘 설정",
        desc: "진동 세기와 감지 민감도를 조절합니다.",
        features: ["진동 세기 3단계", "알림까지 유지 시간", "펌웨어 무선 업데이트 (계획)"]
    }
};
let currentAppTab = 'home';

function switchAppTab(tabKey, { silent = false } = {}) {
    const info = APP_TAB_INFO[tabKey];
    if (!info) return;
    currentAppTab = tabKey;
    document.querySelectorAll('.app-tab-view').forEach(v => v.classList.remove('active'));
    $(`appView${tabKey.charAt(0).toUpperCase()}${tabKey.slice(1)}`)?.classList.add('active');
    document.querySelectorAll('.phone-nav-btn, .app-tab-btn').forEach(btn => {
        const on = btn.dataset.tab === tabKey;
        btn.classList.toggle('active', on);
        if (btn.classList.contains('app-tab-btn')) btn.setAttribute('aria-selected', on);
    });
    $('appTabTitle').textContent = info.title;
    $('appTabDesc').textContent = info.desc;
    $('appFeaturesList').innerHTML = info.features.map(f => `<div class="af-item">${icon('check')}<span>${f}</span></div>`).join('');
    if (!silent) restartAnimation($('appTabDetailContent'), 'swap');
}

function restartAnimation(el, cls) {
    if (!el || prefersReducedMotion) return;
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
}

// ---------------------------------------------------------
// 5. 쇼릴 / 라이트박스  (히어로는 cinematic.js)
// ---------------------------------------------------------
// 데이터 절약 모드 · 2G급 느린 회선에서는 영상을 받지 않고 포스터만 표시
function isConstrainedNetwork() {
    const c = navigator.connection;
    return !!(c && (c.saveData || /(^|-)2g$/.test(c.effectiveType || '')));
}

// 화면 크기에 맞는 쇼릴 소스 (작은 화면·저화질 화면은 720p)
function reelSources() {
    const big = window.innerWidth * Math.min(window.devicePixelRatio || 1, 2) >= 1600;
    const base = big ? 'media/hurryup-showreel' : 'media/hurryup-showreel-720';
    // MP4(H.264) 우선: Safari/WebKit은 WebM을 '재생 가능'으로 답하고도 실패하는 경우가 있음 (QA에서 확인)
    return [{ src: `${base}.mp4`, type: 'video/mp4' }, { src: `${base}.webm`, type: 'video/webm' }];
}
function setSources(video, list) {
    const want = list.map(s => s.src).join('|');
    if (video.dataset.sources === want) return;
    video.dataset.sources = want;
    video.innerHTML = list.map(s => `<source src="${s.src}" type="${s.type}">`).join('');
    video.load();
}

// 브랜드 필름 섹션: 무음 자동 재생 · 루프 · playsinline · 화면 밖 정지 · 움직임 줄이기 대응
function initFilm() {
    const video = $('filmVideo');
    if (!video) return;
    const controls = $('filmControls'), start = $('filmStart'), playBtn = $('filmPlay'), soundBtn = $('filmSound'), bar = $('filmBar');
    const autoplay = !prefersReducedMotion && !isConstrainedNetwork();

    video.removeAttribute('controls');          // JS가 있으면 커스텀 컨트롤 사용
    controls.hidden = false;
    video.preload = 'none';
    // 섹션에 가까워질 때만 해상도에 맞는 소스를 붙여 초기 로딩 비용을 없앰
    let armed = false;
    const arm = () => {
        if (armed) return;
        armed = true;
        if (autoplay) video.preload = 'metadata';
        setSources(video, reelSources());
    };
    new IntersectionObserver(([e], obs) => { if (e.isIntersecting) { arm(); obs.disconnect(); } }, { rootMargin: '800px 0px' }).observe(video);

    const sync = () => {
        playBtn.classList.toggle('paused', video.paused);
        playBtn.setAttribute('aria-label', video.paused ? '재생' : '일시정지');
        if (!video.paused) start.hidden = true; // 큰 재생 버튼은 재생 시작 전에만 표시
    };
    let userPaused = false, inView = false;

    const play = () => { arm(); return video.play().catch(() => { start.hidden = false; }); };
    if (autoplay) {
        new IntersectionObserver(([e]) => {
            inView = e.isIntersecting;
            if (inView && !userPaused) play(); else if (!inView) video.pause();
        }, { threshold: 0.35 }).observe(video);
    } else {
        start.hidden = false; // 움직임 줄이기: 포스터 + 재생 버튼, 자동 재생 없음
    }

    start.addEventListener('click', () => { userPaused = false; play(); });
    video.addEventListener('click', () => { video.paused ? (userPaused = false, play()) : (userPaused = true, video.pause()); });
    playBtn.addEventListener('click', () => { video.paused ? (userPaused = false, play()) : (userPaused = true, video.pause()); });
    soundBtn.addEventListener('click', () => {
        video.muted = !video.muted;
        const label = video.muted ? '소리 켜기' : '소리 끄기';
        soundBtn.classList.toggle('on', !video.muted);
        soundBtn.querySelector('span').textContent = label;
        soundBtn.setAttribute('aria-label', label); // 모바일에서는 글자가 숨겨지므로 이름을 직접 지정
        if (!video.muted && video.paused) { userPaused = false; play(); }
    });
    $('filmFull').addEventListener('click', () => {
        const el = $('filmFrame');
        if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
        else if (video.webkitEnterFullscreen) video.webkitEnterFullscreen(); // iOS Safari
    });
    ['play', 'pause', 'playing'].forEach(ev => video.addEventListener(ev, sync));
    video.addEventListener('timeupdate', () => { if (video.duration) bar.style.transform = `scaleX(${video.currentTime / video.duration})`; });
    let rt; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { if (armed && video.paused) setSources(video, reelSources()); }, 300); });
}

function initDialogs() {
    const reel = $('reelDialog'), reelVideo = $('reelVideo');
    $('reelOpenBtn')?.addEventListener('click', () => {
        if (typeof reel.showModal !== 'function') { window.open('media/hurryup-showreel.mp4', '_blank'); return; }
        $('filmVideo')?.pause();
        setSources(reelVideo, reelSources());
        reel.showModal(); lockScroll();
        reelVideo.play().catch(() => {});
    });
    $('reelCloseBtn')?.addEventListener('click', () => reel.close());
    reel?.addEventListener('close', () => { reelVideo.pause(); unlockScroll(); $('reelOpenBtn').focus(); });
    reel?.addEventListener('click', (e) => { if (e.target === reel) reel.close(); });

    const lb = $('lightbox');
    let opener = null;
    document.querySelectorAll('[data-lightbox]').forEach(btn => {
        btn.addEventListener('click', () => {
            opener = btn;
            const img = new Image();
            img.src = btn.dataset.lightbox;
            img.alt = btn.querySelector('img')?.alt || '';
            $('lightboxMedia').replaceChildren(img);
            $('lightboxCaption').textContent = btn.dataset.caption || '';
            if (typeof lb.showModal === 'function') { lb.showModal(); lockScroll(); }
        });
    });
    $('lightboxClose')?.addEventListener('click', () => lb.close());
    lb?.addEventListener('click', (e) => { if (e.target === lb) lb.close(); });
    lb?.addEventListener('close', () => { unlockScroll(); opener?.focus(); });
}

// ---------------------------------------------------------
// 6. 문의 폼 (실제 전송 여부를 정직하게 안내)
// ---------------------------------------------------------
function initContactForm() {
    const form = $('contactForm'), status = $('formStatus');
    if (!form) return;
    const live = !!CONTACT_ENDPOINT;
    form.dataset.mode = live ? 'live' : 'offline';

    // CTA에서 문의 유형 미리 선택
    document.querySelectorAll('[data-inquiry]').forEach(a => {
        a.addEventListener('click', () => { $('cfType').value = a.dataset.inquiry; });
    });

    // 개인정보 안내 채우기 (site-config.js → privacy)
    const fillPrivacy = (key, fallback) => document.querySelectorAll(`[data-privacy="${key}"]`).forEach(el => { el.textContent = PRIVACY[key] || fallback; });
    fillPrivacy('controller', '온라인 접수 시작 전 안내 예정');
    fillPrivacy('contactEmail', '온라인 접수 시작 전 안내 예정');
    fillPrivacy('retention', '온라인 접수 시작 전 안내 예정');
    fillPrivacy('processor', '없음');
    const consent = $('cfConsent');
    // 전송 기능이 없으면 수집도 없으므로, 동의 항목 대신 '외부로 전송되지 않음' 안내를 미리 보여줌
    $('cfConsentRow').hidden = !live;
    consent.required = live;
    $('cfOfflineNote').hidden = live;

    // 선택: Cloudflare Turnstile (토큰은 반드시 서버에서 검증해야 효과가 있음)
    let turnstileId = null;
    if (live && CONTACT.turnstileSiteKey) {
        window.__hurryupTurnstile = () => {
            turnstileId = window.turnstile.render('#cfTurnstile', { sitekey: CONTACT.turnstileSiteKey, theme: 'dark', language: 'ko' });
        };
        const ts = document.createElement('script');
        ts.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=__hurryupTurnstile';
        ts.async = true; ts.defer = true;
        document.head.appendChild(ts);
        $('cfTurnstile').hidden = false;
    }

    // 스팸 방지: 처음 입력한 시점 기록 (최소 작성 시간)
    let firstTouch = 0;
    const touch = () => { if (!firstTouch) firstTouch = Date.now(); };
    form.addEventListener('input', touch);
    form.addEventListener('focusin', touch);

    const setStatus = (type, html) => { status.hidden = false; status.className = `form-status ${type}`; status.innerHTML = html; };
    const copyHtml = `<button type="button" class="btn-copy" id="copyInquiry">${icon('copy')} 내용 복사</button>`;
    const bindCopy = (text) => {
        $('copyInquiry')?.addEventListener('click', async () => {
            try { await navigator.clipboard.writeText(text); showToast('문의 내용을 복사했습니다.', 'success'); }
            catch { showToast('복사하지 못했습니다. 직접 선택해 복사해 주세요.', 'info'); }
        });
    };
    const sentAt = {
        get() { try { return +sessionStorage.getItem('hurryupInquirySent') || 0; } catch { return 0; } },
        set() { try { sessionStorage.setItem('hurryupInquirySent', String(Date.now())); } catch { /* 저장 불가 환경 */ } }
    };

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }
        const fd = new FormData(form);
        const get = (k) => String(fd.get(k) || '').trim();
        const typeLabel = $('cfType').selectedOptions[0].textContent;
        const text = `[${typeLabel}]\n이름: ${get('name')}\n이메일: ${get('email')}\n\n${get('message')}`;

        if (!live) {
            setStatus('pending', `${icon('info')}<div><strong>아직 전송되지 않았습니다.</strong><span>온라인 접수 기능을 준비 중입니다. 작성한 내용을 복사해 두실 수 있습니다.</span>${copyHtml}</div>`);
            bindCopy(text);
            return;
        }

        // --- 기본 스팸 방지 (서버 측 검증을 대신하지는 않음) ---
        if (get('_gotcha')) {                     // 사람에게 보이지 않는 필드가 채워짐 → 자동 입력 봇
            setStatus('error', `${icon('circle-alert')}<div><strong>전송할 수 없습니다.</strong><span>페이지를 새로고침한 뒤 다시 시도해 주세요.</span></div>`);
            return;
        }
        if (!firstTouch || Date.now() - firstTouch < CONTACT.minFillSeconds * 1000) {
            setStatus('error', `${icon('circle-alert')}<div><strong>조금 너무 빨랐습니다.</strong><span>내용을 확인하신 뒤 몇 초 후 다시 보내 주세요.</span></div>`);
            return;
        }
        const last = sentAt.get();
        if (last && Date.now() - last < CONTACT.cooldownSeconds * 1000) {
            setStatus('pending', `${icon('info')}<div><strong>방금 문의가 접수되었습니다.</strong><span>추가 문의는 잠시 후 보내 주세요.</span></div>`);
            return;
        }
        if (CONTACT.turnstileSiteKey && !get('cf-turnstile-response')) {
            setStatus('error', `${icon('circle-alert')}<div><strong>보안 확인이 필요합니다.</strong><span>보안 확인을 완료한 뒤 다시 보내 주세요.</span></div>`);
            return;
        }

        const payload = { ...CONTACT.extraFields, type: get('type'), typeLabel, name: get('name'), email: get('email'), message: get('message'),
            consent: consent.checked ? 'agree' : '', _subject: CONTACT.subject, page: location.origin + location.pathname };
        if (get('cf-turnstile-response')) payload['cf-turnstile-response'] = get('cf-turnstile-response');

        const btn = form.querySelector('[type="submit"]');
        btn.disabled = true;
        form.setAttribute('aria-busy', 'true');
        const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
        const timer = ctrl ? setTimeout(() => ctrl.abort(), CONTACT.timeoutMs) : 0;
        try {
            const headers = { Accept: 'application/json' };
            let body;
            if (CONTACT.format === 'form') {
                body = new FormData();
                Object.entries(payload).forEach(([k, v]) => body.append(k, v));
            } else {
                headers['Content-Type'] = 'application/json';
                body = JSON.stringify(payload);
            }
            const res = await fetch(CONTACT_ENDPOINT, { method: 'POST', headers, body, signal: ctrl ? ctrl.signal : undefined });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            // 서버가 성공을 확인한 경우에만 '접수'로 안내: 2xx + (빈 응답 또는 실패 표시가 없는 JSON)
            const raw = await res.text();
            if (raw.trim()) {
                if (!/json/i.test(res.headers.get('content-type') || '')) throw new Error('unconfirmed response');
                const json = JSON.parse(raw);
                if (json.ok === false || json.success === false || json.error || json.errors) throw new Error('rejected');
            }
            sentAt.set();
            form.reset();
            firstTouch = 0;
            setStatus('success', `${icon('circle-check')}<div><strong>문의가 접수되었습니다.</strong><span>입력하신 이메일로 답변드리겠습니다.</span></div>`);
        } catch (err) {
            const timedOut = err && err.name === 'AbortError';
            setStatus('error', `${icon('circle-alert')}<div><strong>${timedOut ? '응답이 없어 접수 여부를 확인하지 못했습니다.' : '전송에 실패했습니다.'}</strong><span>잠시 후 다시 시도하시거나, 작성한 내용을 복사해 두세요.</span>${copyHtml}</div>`);
            bindCopy(text);
        } finally {
            clearTimeout(timer);
            btn.disabled = false;
            form.removeAttribute('aria-busy');
            if (turnstileId !== null && window.turnstile) window.turnstile.reset(turnstileId);
        }
    });
}

// ---------------------------------------------------------
// 6-1. 사양 요약 문구 · 갤러리 실사 슬롯 (site-config.js)
// ---------------------------------------------------------
function applySpecText() {
    document.querySelectorAll('[data-spec-state]').forEach(el => { el.textContent = spec(el.dataset.specState).status; });
    document.querySelectorAll('[data-spec]').forEach(el => {
        const s = spec(el.dataset.spec);
        el.textContent = s.short || s.value;
    });
    // 가격은 공개 · 확정 · 근거 문서가 모두 있을 때만 표시 (기본은 '미정' 문구 유지)
    const price = spec('price'), note = $('protoPriceNote');
    if (note && price.status === '확정' && price.public === true && price.value) {
        note.textContent = `가격 ${price.value} · 출시 일정은 아직 정해지지 않았습니다.`;
    }
}

const GALLERY_SIZES = {
    side: '(max-width: 640px) calc(100vw - 32px), (max-width: 1240px) 92vw, 1200px',
    default: '(max-width: 640px) calc(100vw - 32px), (max-width: 1024px) 46vw, 400px'
};
function initGallerySlots() {
    const slots = CFG.gallery || {};
    document.querySelectorAll('[data-gallery-slot]').forEach(fig => {
        const key = fig.dataset.gallerySlot, c = slots[key];
        const ph = fig.querySelector('.g-placeholder');
        if (!c || !c.src || !ph) return;                    // 사진이 없으면 자리 표시 유지
        const tag = fig.querySelector('figcaption .media-tag');
        if (!String(c.alt || '').trim()) console.warn(`[HURRY UP] 갤러리 '${key}'에 alt 설명이 없습니다. 사진 내용을 설명하는 문구를 넣어 주세요.`);
        const alt = String(c.alt || '').trim() || `허리업 시제품 ${c.caption || ''} 사진`.trim();
        const ratio = [...ph.classList].find(cl => cl.startsWith('ratio-')) || '';
        const largest = String(c.srcset || '').split(',').map(x => x.trim().split(/\s+/)[0]).filter(Boolean).pop() || c.src;

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `g-media g-photo ${ratio}`;
        btn.dataset.lightbox = largest;
        btn.dataset.caption = `${c.caption || ''} — ${c.kind || '실사'}`;
        btn.setAttribute('aria-label', `${c.caption || '사진'} 크게 보기`);
        const img = new Image();
        img.alt = alt;
        img.width = c.width; img.height = c.height;
        img.loading = 'lazy'; img.decoding = 'async';
        if (c.srcset) { img.srcset = c.srcset; img.sizes = c.sizes || GALLERY_SIZES[key] || GALLERY_SIZES.default; }
        img.src = c.src;
        // 파일이 없거나 깨지면 자리 표시로 되돌림 (깨진 이미지 노출 방지)
        img.addEventListener('error', () => {
            console.warn(`[HURRY UP] 갤러리 '${key}' 이미지를 불러오지 못해 자리 표시로 되돌립니다: ${c.src}`);
            btn.replaceWith(ph);
            if (tag) { tag.textContent = '사진 준비 중'; tag.classList.add('muted'); }
        }, { once: true });
        btn.appendChild(img);
        ph.replaceWith(btn);
        if (tag) { tag.textContent = c.kind || '실사'; tag.classList.remove('muted'); }
    });
}

// ---------------------------------------------------------
// 7. 내비게이션 / 스크롤
// ---------------------------------------------------------
const navbar = $('navbar'), navLinks = $('navLinks'), mobileMenuBtn = $('mobileMenuBtn'), scrollTopBtn = $('scrollTop');
function lockScroll() { document.body.style.overflow = 'hidden'; lenis?.stop(); }
function unlockScroll() { document.body.style.overflow = ''; lenis?.start(); }

function closeMobileMenu() {
    navLinks.classList.remove('active');
    mobileMenuBtn.classList.remove('active');
    mobileMenuBtn.setAttribute('aria-expanded', 'false');
    mobileMenuBtn.setAttribute('aria-label', '메뉴 열기');
}

function initNavigation() {
    mobileMenuBtn.addEventListener('click', () => {
        const open = !navLinks.classList.contains('active');
        navLinks.classList.toggle('active', open);
        mobileMenuBtn.classList.toggle('active', open);
        mobileMenuBtn.setAttribute('aria-expanded', open);
        mobileMenuBtn.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
        window.dispatchEvent(new Event('scroll'));
    });

    // 앵커 이동
    //   · 시네마틱 히어로의 고정 구간을 지나가는 이동(위 · 아래 모두)은 즉시 점프 → 플라이오버는 손으로 스크롤할 때만 재생
    //   · 히어로 아래 섹션끼리는 짧게 부드럽게 (움직임 줄이기: 즉시)
    //   · 주소에 #을 기록 → 뒤로/앞으로 가기 · 딥 링크 · 공유 링크 유지
    const cine = $('home');
    const pinEnd = () => (cine && cine.classList.contains('is-live')) ? cine.offsetTop + cine.offsetHeight - window.innerHeight : -1;   // 고정 구간은 3D가 실제로 동작할 때만
    const jumpTo = (hash, { push = true, focusEl = null } = {}) => {
        const target = hash && hash.length > 1 ? document.querySelector(hash) : null;
        if (hash && hash.length > 1 && !target) return false;
        // scroll-margin-top(CSS)만큼 위를 띄움 → 고정 내비게이션이 대상(예: 체압 체험의 자세 선택)을 가리지 않음
        const margin = target ? parseFloat(getComputedStyle(target).scrollMarginTop) || 0 : 0;
        const y = (!target || hash === '#home') ? 0 : Math.max(0, Math.round(target.getBoundingClientRect().top + window.scrollY - margin));
        const instant = prefersReducedMotion || Math.min(window.scrollY, y) < pinEnd();
        // 기록을 먼저 남긴 뒤 이동 (이동 후에 남기면 이전 기록에 이동한 위치가 저장되어 뒤로 가기가 엉뚱한 곳으로 감)
        if (push && location.hash !== hash) history.pushState(null, '', hash || location.pathname + location.search);
        if (lenis) lenis.scrollTo(y, instant ? { immediate: true, force: true } : { duration: 1.0, force: true });
        else window.scrollTo({ top: y, behavior: instant ? 'instant' : 'smooth' });
        if (focusEl) instant ? focusEl.focus({ preventScroll: true }) : setTimeout(() => focusEl.focus({ preventScroll: true }), 1050);
        return true;
    };
    document.addEventListener('click', (e) => {
        const a = e.target.closest('a[href^="#"]');
        if (!a || a.closest('dialog')) return;
        const hash = a.getAttribute('href');
        if (hash.length > 1 && !document.querySelector(hash)) return;
        e.preventDefault();
        closeMobileMenu();
        const target = hash.length > 1 ? document.querySelector(hash) : null;
        const focusEl = (a.hasAttribute('data-skip-intro') || a.hasAttribute('data-demo-start')) ? target : hash === '#contact' ? $('cfName') : hash === '#main' ? target : null;
        jumpTo(hash, { focusEl });
    });
    // 뒤로/앞으로: 브라우저 자동 복원 대신 기록의 #으로 이동 (#이 없으면 맨 위) — 고정 구간을 지나면 즉시
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    window.addEventListener('popstate', () => jumpTo(location.hash, { push: false }));

    const linkMap = new Map();
    navLinks.querySelectorAll('a[href^="#"]').forEach(a => linkMap.set(a.getAttribute('href').slice(1), a));
    const io = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            navLinks.querySelectorAll('a').forEach(a => { a.classList.remove('active'); a.removeAttribute('aria-current'); });
            const link = linkMap.get(entry.target.id);
            if (link && !link.parentElement.classList.contains('nav-links-cta')) { link.classList.add('active'); link.setAttribute('aria-current', 'true'); }
        });
    }, { rootMargin: '-45% 0px -50% 0px' });
    document.querySelectorAll('main section[id]').forEach(s => io.observe(s));

    const progress = $('scrollProgress');
    const cineHero = document.querySelector('.cine');
    if (cineHero && location.protocol === 'file:') {
        // 파일을 직접 열면 브라우저 보안 정책(CORS)이 모듈 · 텍스처를 막음 → 정적 포스터 히어로로 표시
        cineHero.dataset.static = 'file';
        console.warn('[HURRY UP] file://로 열어 3D 히어로를 불러올 수 없습니다 (브라우저 보안 정책). 정적 포스터로 표시합니다. 3D 확인: 폴더의 「사이트 열기.cmd」 또는 python tools/serve.py --src --open');
        // 파일로 직접 연 사람(제작자)에게만 보이는 안내 — 배포된 사이트(http/https)에서는 나타나지 않음
        const tip = document.createElement('p');
        tip.className = 'cine-file-note';
        tip.innerHTML = '3D 히어로는 파일로 직접 열면 실행되지 않습니다 (브라우저 보안 정책). 폴더의 <b>사이트 열기.cmd</b>를 더블클릭해 여세요.';
        $('cineCopy')?.appendChild(tip);
    }
    const LIGHT_SECTIONS = new Set(['home', 'comparison', 'technology', 'app-preview', 'prototype', 'gallery', 'roadmap', 'faq']);
    let ticking = false;
    const onScroll = () => {
        const y = window.scrollY;
        navbar.classList.toggle('scrolled', y > 24);
        const under = document.elementFromPoint(window.innerWidth / 2, navbar.offsetHeight + 2);
        const sec = under && under.closest('section[id]');
        // 첫 화면은 끝에서 흑연색으로 가라앉음 (cinematic.js가 data-tone 갱신) → 그때는 어두운 판 내비게이션
        const light = !!sec && LIGHT_SECTIONS.has(sec.id) && !(sec.id === 'home' && sec.dataset.tone === 'dark');
        navbar.classList.toggle('on-light', light && !navLinks.classList.contains('active'));
        // 시네마틱 히어로가 고정되어 있는 동안은 숨김 (건너뛰기 태그와 겹치지 않게)
        scrollTopBtn.classList.toggle('visible', y > Math.max(600, cineHero?.classList.contains('is-live') ? cineHero.offsetHeight - window.innerHeight : 0));
        const max = document.documentElement.scrollHeight - window.innerHeight;
        if (progress) progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
        ticking = false;
    };
    window.addEventListener('scroll', () => { if (!ticking) { requestAnimationFrame(onScroll); ticking = true; } }, { passive: true });
    window.addEventListener('hurryup:tone', () => { if (!ticking) { requestAnimationFrame(onScroll); ticking = true; } });
    onScroll();
}

// ---------------------------------------------------------
// 8. 연출
// ---------------------------------------------------------
function initReveals() {
    document.querySelectorAll('[data-reveal-group]').forEach(group => {
        group.querySelectorAll(':scope > [data-reveal]').forEach((el, i) => el.style.setProperty('--reveal-delay', `${i * 0.08}s`));
    });
    const targets = document.querySelectorAll('[data-reveal]');
    if (prefersReducedMotion || !('IntersectionObserver' in window)) { targets.forEach(el => el.classList.add('is-in')); return; }
    const io = new IntersectionObserver(entries => {
        entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('is-in'); io.unobserve(entry.target); } });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });
    targets.forEach(el => io.observe(el));
}

function initSpotlightCards() {
    document.querySelectorAll('.spotlight-card').forEach(card => {
        card.addEventListener('pointermove', (e) => {
            const r = card.getBoundingClientRect();
            card.style.setProperty('--mx', `${e.clientX - r.left}px`);
            card.style.setProperty('--my', `${e.clientY - r.top}px`);
        });
    });
}

function splitStatementWords() {
    const el = document.querySelector('[data-split-words]');
    if (!el) return [];
    const words = el.textContent.trim().split(/\s+/);
    // 단어별 애니메이션용 span은 보조기기에서 숨기고, 문장 전체를 한 번에 읽도록 별도 텍스트 제공
    el.innerHTML = `<span class="sr-only">${words.join(' ')}</span>` + words.map(w => `<span class="w" aria-hidden="true">${w}</span>`).join(' ');
    return el.querySelectorAll('.w');
}

function initStory() {
    const stage = $('storyStage'), steps = document.querySelectorAll('.story-step'), bars = document.querySelectorAll('.story-progress span');
    if (!stage || !steps.length) return;
    const io = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            const n = entry.target.dataset.step;
            stage.dataset.step = n;
            steps.forEach(s => s.classList.toggle('active', s === entry.target));
            bars.forEach((b, i) => b.classList.toggle('active', String(i + 1) === n));
        });
    }, { rootMargin: '-45% 0px -45% 0px' });
    steps.forEach(s => io.observe(s));
}

function initSmoothScroll() {
    if (prefersReducedMotion || typeof window.Lenis === 'undefined') return;
    lenis = new window.Lenis({ lerp: 0.09, smoothWheel: true });
    window.__hurryupLenis = lenis;   // cinematic.js: Lenis가 이미 부드럽게 하므로 추가 감쇠 없이 진행도를 따름
    if (hasGSAP()) {
        lenis.on('scroll', window.ScrollTrigger.update);
        window.gsap.ticker.add(t => lenis.raf(t * 1000));
        window.gsap.ticker.lagSmoothing(0);
    } else {
        const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
        requestAnimationFrame(raf);
    }
}

function initScrollAnimations(words) {
    const statement = document.querySelector('[data-split-words]');
    if (prefersReducedMotion || !hasGSAP()) {
        if (statement) {
            const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { statement.classList.add('is-lit'); io.disconnect(); } }, { threshold: 0.3 });
            io.observe(statement);
        }
        return;
    }
    const { gsap, ScrollTrigger } = window;
    gsap.registerPlugin(ScrollTrigger);

    if (words && words.length) {
        words.forEach(w => { w.style.transition = 'none'; });
        gsap.to(words, { opacity: 1, stagger: 0.1, ease: 'none', scrollTrigger: { trigger: statement, start: 'top 80%', end: 'bottom 45%', scrub: 0.6 } });
    }

    gsap.fromTo('.smartphone-frame', { y: 60, rotate: -2 }, { y: -20, rotate: 0, ease: 'none', scrollTrigger: { trigger: '.app-preview-section', start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.fromTo('.proto-visual img', { scale: 0.92, y: 30 }, { scale: 1.04, y: -20, ease: 'none', scrollTrigger: { trigger: '#prototype', start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.fromTo('.timeline', { '--progress': 0 }, { '--progress': 1, ease: 'power2.out', scrollTrigger: { trigger: '.timeline', start: 'top 85%', end: 'top 45%', scrub: 0.6 } });

    window.addEventListener('load', () => ScrollTrigger.refresh());
}

// ---------------------------------------------------------
// 9. FAQ / 토스트
// ---------------------------------------------------------
function toggleFaq(button) {
    const item = button.closest('.faq-item');
    const willOpen = !item.classList.contains('active');
    document.querySelectorAll('.faq-item').forEach(i => { i.classList.remove('active'); i.querySelector('.faq-question').setAttribute('aria-expanded', 'false'); });
    if (willOpen) { item.classList.add('active'); button.setAttribute('aria-expanded', 'true'); }
}

let toastTimeout = null;
function showToast(message, type = 'info') {
    const t = $('toastNotification');
    if (!t) return;
    clearTimeout(toastTimeout);
    $('toastMessage').textContent = message;
    $('toastIcon').innerHTML = `<use href="#i-${type === 'success' ? 'circle-check' : 'info'}"/>`;
    $('toastIcon').setAttribute('class', `icon toast-icon ${type === 'success' ? 'is-success' : 'is-info'}`);
    t.classList.add('show');
    toastTimeout = setTimeout(() => t.classList.remove('show'), 3200);
}

// ---------------------------------------------------------
// 10. 초기화
// ---------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    // 센서 수 문구 동기화
    document.querySelectorAll('[data-sensor-count]').forEach(el => { el.textContent = SENSOR_MAP.length; });

    // 데이터 기반 그래픽
    const bento = $('bentoSensorDots');
    if (bento) {
        bento.innerHTML = '<div class="sd-shape"><svg viewBox="0 0 460 380"><use href="#cushionShape"/></svg></div>';
        renderSensorDots(bento.querySelector('.sd-shape'));
    }
    renderSensorDots($('storySensorDots'));
    renderSensorDots($('appMiniMap'), 'mini-dot');
    const diagram = $('gallerySensorDiagram');
    if (diagram) {
        renderSensorDots(diagram, 'diag-dot').forEach((d, i) => { d.textContent = SENSOR_MAP[i].id; });
    }

    initPressureSimulation();
    renderHardwareSpecs();
    switchAppTab('home', { silent: true });

    applySpecText();
    initGallerySlots();   // 라이트박스 연결(initDialogs) 전에 실행
    initNavigation();
    initDialogs();
    initContactForm();
    initFilm();
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMobileMenu(); });

    const words = splitStatementWords();
    initReveals();
    initSpotlightCards();
    initStory();
    initSmoothScroll();
    initScrollAnimations(words);
});
