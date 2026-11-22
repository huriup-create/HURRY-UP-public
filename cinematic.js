/* =========================================================
   허리업 첫 화면 — 하나로 이어지는 3D 스크롤 시퀀스 (실험 브랜치)
   의자 위 방석 → 카메라가 다가감 → 방석이 의자에서 떠올라 화면 가운데로 → 의자는 아래로 사라짐
   → 방석 레이어가 위아래로 분리(분해도) → 압력 센서 레이어 강조(라벨 2개) → 흑연색으로 가라앉으며 다음 섹션으로
   · 스크롤 진행도 0→1이 곧 장면. 자동 재생 없음. 위로 스크롤하면 모든 움직임이 그대로 되감김(진행도의 순수 함수).
     고정은 CSS position: sticky (.cine-stage), 진행도는 스크롤 위치에서 직접 계산 (별도 스크롤 컨트롤러 없음).
   · 실제 3D 형상 (이미지 교체 없음):
     - 방석: 제품 렌더에서 원근 보정해 얻은 탑뷰 외곽선(CUSHION_3D)을 돌출(Extrude) — 실제 CAD가 아닌 근사 형상
     - 레이어 6장: 하드웨어 섹션에 있던 분해도(개념도)와 같은 순서 · 이름 · 부품 표기
       01 폼 · 외피 커버 / 02 압력센서 레이어 / 03 진동 모터 / 04 메인 제어 보드 / 05 BLE 통신 / 06 배터리 · 전원
       부품 위치 · 크기는 그 분해도 그림(구 HW_LAYER_ART)의 좌표를 그대로 옮김. 새 부품 · 수치를 만들지 않음
       하부 셸은 실제 렌더에 보이는 외곽 하우징 — 레이어들이 그 안에서 빠져나옴 (번호 없음)
     - 센서 점: script.js의 SENSOR_MAP(체압 체험과 같은 12점 콘셉트 배열)
     - 의자: 코드로 만든 단순 범용 사무용 의자 (특정 제품 아님)
   · DESIGN.md › Cinematic 3D Exception 범위: 원근 · 그림자 · 조명은 WebGL 속 물체에만.
   · 움직임 줄이기 · 데이터 절약 · WebGL 미지원 · 초기화 실패 → 첫 장면 포스터 + 같은 HTML 카피.
   ========================================================= */
// Three.js r170 (MIT): 사이트에 포함된 사본을 먼저 사용 → 인터넷 없이 발표해도 동작. 사본이 없을 때만 CDN.
const THREE_LOCAL = new URL('vendor/three-0.170.0/three.module.min.js', import.meta.url).href;
const THREE_CDN = 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.min.js';
const loadThree = () => import(THREE_LOCAL).catch(() => import(THREE_CDN));
const qs = new URLSearchParams(location.search);
const POSTER_MODE = qs.has('poster');      // tools/preview_cinematic.py --posters

const section = document.getElementById('home');
const canvas = document.getElementById('cineCanvas');
const copy = document.getElementById('cineCopy');
const labels = [...document.querySelectorAll('.cine-label')];
const callout = document.getElementById('cineCallout');   // 첫 화면: '허리업 스마트 방석' 리더선 라벨 (카피와 함께 사라짐)

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const saveData = !!(navigator.connection && (navigator.connection.saveData || /(^|-)2g$/.test(navigator.connection.effectiveType || '')));
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const DEG = Math.PI / 180;
const FOV = 30;

// ---------------------------------------------------------
// 치수 (월드 단위 = mm). 방석 외곽선은 viewBox 460×380 그대로 1단위 = 1mm 로 사용
// ---------------------------------------------------------
// 3D 방석 외곽선 (탑뷰, 1단위 = 1mm, 위쪽 = 앞): 제품 렌더(images/product-hd.png)의 윗면 가장자리를 원근 보정 · 앞뒤 대칭화해 얻은 형상.
//   두 엽(좌 · 우)과 앞 · 뒤의 잘록한 곳, 앞쪽 잘록한 곳에 전원 버튼. 체압 체험의 탑뷰 그림(#cushionShape)과는 별개
const CUSHION_3D = 'M 232 43.2 C 223.8 48.3, 217.6 50.5, 210 51.4 C 202.3 52.3, 196 52.3, 186.2 48.7 C 176.5 45.1, 164.2 34.8, 151.2 29.6 C 138.3 24.5, 120.6 16.6, 108.7 17.5 C 96.8 18.5, 87.5 27.3, 79.9 35.1 C 72.3 43, 67.5 54.4, 63.1 64.7 C 58.7 74.9, 56.2 86.1, 53.6 96.5 C 50.9 106.9, 49 117.1, 47.1 127.2 C 45.2 137.3, 43.5 147.1, 42.3 157 C 41.1 166.9, 40.1 176.8, 40 186.7 C 39.9 196.6, 40.6 206.5, 41.5 216.4 C 42.5 226.3, 44.2 236.1, 45.9 246.1 C 47.6 256.1, 49.5 266.2, 52 276.6 C 54.4 286.9, 56.7 297.9, 60.6 308.3 C 64.4 318.7, 68.5 330.2, 75.3 338.9 C 82 347.6, 90 357.7, 101 360.5 C 112 363.2, 128.3 359.8, 141.5 355.4 C 154.6 351, 169.3 338.5, 179.9 334 C 190.5 329.4, 197.2 328.2, 205.1 328.2 C 212.9 328.2, 219 329.7, 226.9 334 C 234.8 338.2, 242.7 347.2, 252.5 353.9 C 262.3 360.6, 274.2 369.9, 285.7 374 C 297.2 378.2, 310.5 380.3, 321.6 378.9 C 332.7 377.5, 343.4 371.8, 352.4 365.6 C 361.4 359.3, 369 350.2, 375.6 341.3 C 382.2 332.5, 387.3 322.2, 391.8 312.3 C 396.2 302.4, 399.3 292, 402.4 282 C 405.5 272, 408 262.1, 410.4 252.3 C 412.9 242.5, 415.4 232.9, 417 223.1 C 418.6 213.2, 419.8 203.3, 420 193.3 C 420.2 183.4, 419.4 173.4, 418 163.5 C 416.7 153.6, 414.4 144, 412.1 134.2 C 409.8 124.4, 407.2 114.7, 404.3 104.7 C 401.4 94.8, 398.6 84.4, 394.5 74.4 C 390.4 64.4, 385.8 54, 379.8 44.8 C 373.7 35.6, 366.6 26.2, 358.2 19.2 C 349.7 12.1, 339.8 5.3, 329 2.7 C 318.3 0.1, 305.3 0.4, 293.7 3.3 C 282.1 6.3, 269.6 13.7, 259.4 20.4 C 249.1 27, 240.2 38, 232 43.2 Z';
const OUTLINE_FALLBACK = 'M 230 40 C 280 40, 340 25, 390 60 C 440 95, 450 170, 435 240 C 420 310, 350 350, 270 345 C 240 343, 230 330, 230 330 C 230 330, 220 343, 190 345 C 110 350, 40 310, 25 240 C 10 170, 20 95, 70 60 C 120 25, 180 40, 230 40 Z';
const VB = { w: 460, h: 380 };
const SEAT_TOP = 470;                      // 의자 좌판 윗면 높이
const LIFT = 400;                          // 방석이 떠오르는 높이
const SHELL = { depth: 22, bevel: 10 };    // 하부 셸: 높이 42
const PLATE = { scale: 0.86, depth: 2.4 };   // 내부 레이어 판 (02–06): 셸 안쪽에 들어가는 크기
const PAD = { scale: 0.88, depth: 6, bevel: 15 };   // 01 커버 · 폼: 높이 36
const PAD_SINK = 12;                       // 조립 상태에서 폼이 셸 테두리 안으로 들어간 깊이
// 분해 위치 (조립 위치 기준 mm): 01은 위로, 02–06은 그 아래로 같은 간격, 셸(하우징)은 맨 아래
const EXPLODE = { pad: 300, plates: [210, 120, 30, -60, -150], shell: -250 };

// ---------------------------------------------------------
// 안무 (진행도 0–1)
// ---------------------------------------------------------
const T = {
    copyOut: [0.02, 0.09],                 // 헤드라인 · 버튼 퇴장
    frame: [0.00, 0.26],                   // 카피 아래 → 화면 가운데로 구도 이동
    lift: [0.26, 0.46],                    // 방석이 의자에서 떠오름
    chairOut: [0.30, 0.47],                // 의자가 아래로 빠지며 사라짐
    explode: [0.50, 0.70],                 // 레이어 분리
    sense: [0.60, 0.72],                   // 센서 점이 켜짐
    side: [0.50, 0.66], center: [0.86, 0.96],   // 분해 동안 스택을 살짝 왼쪽으로 → 오른쪽에 라벨 자리
    labelsIn: [0.66, 0.73], labelsOut: [0.83, 0.87],
    dusk: [0.87, 0.97],                    // 스튜디오 → 흑연색 (다음 섹션과 같은 바탕)
};
// 카메라 경로: [진행도, 바라보는 높이 y, 담을 세로 반지름(mm), 방위각°(0 = 정면), 고도°, 담을 가로 반지름(mm)]
const CAM = [
    [0.00, 560, 640, 30, 13, 640],
    [0.08, 550, 610, 29, 14, 610],
    [0.26, 505, 330, 22, 27, 330],
    [0.46, SEAT_TOP + LIFT + 30, 330, 14, 31, 330],
    [0.70, SEAT_TOP + LIFT + 55, 540, 8, 34, 400],
    [1.00, SEAT_TOP + LIFT + 55, 520, 4, 30, 380],
];
// 휴대폰: 좌판 중심의 타이트한 첫 구도 (방석이 화면 폭의 약 3분의 2). 0.26 이후는 위 경로와 같음
const CAM_PHONE = [
    [0.00, 525, 380, 30, 16, 380],
    [0.08, 520, 370, 28, 18, 370],
    ...CAM.slice(2),
];
// 첫 화면 제품 위치 (화면 비): 넓은 화면은 카피가 왼쪽 열 → 의자를 오른쪽 절반 가운데에 두고, 카피가 빠지는 동안 가운데로
const START_AX = { wide: 0.70, tablet: 0.5, phone: 0.5 };

// 분해 장면의 화면 배치 (화면 비율별): 스택 중심 x(화면 비) · 담을 반지름 배율
const SIDE = { wide: { ax: 0.42, r: 1.0 }, tablet: { ax: 0.40, r: 1.05 }, phone: { ax: 0.33, r: 1.15 } };

function profileFor(w, h) {                // style.css의 첫 화면 미디어 쿼리와 같은 경계
    if (w >= 1024 && w / h > 1.25) return 'wide';
    if (w >= 600) return 'tablet';
    return 'phone';
}

// 단조 3차 보간(PCHIP): 하나의 연속 경로, 오버슈트 · 정지 없음
function pchip(xs, ys) {
    const n = xs.length, d = [], m = new Array(n);
    for (let k = 0; k < n - 1; k++) d.push((ys[k + 1] - ys[k]) / (xs[k + 1] - xs[k]));
    m[0] = d[0]; m[n - 1] = d[n - 2];
    for (let k = 1; k < n - 1; k++) {
        if (d[k - 1] * d[k] <= 0) { m[k] = 0; continue; }
        const h0 = xs[k] - xs[k - 1], h1 = xs[k + 1] - xs[k], w1 = 2 * h1 + h0, w2 = h1 + 2 * h0;
        m[k] = (w1 + w2) / (w1 / d[k - 1] + w2 / d[k]);
    }
    return (x) => {
        let i = 0; while (i < n - 2 && x > xs[i + 1]) i++;
        const h = xs[i + 1] - xs[i], t = clamp((x - xs[i]) / h), t2 = t * t, t3 = t2 * t;
        return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1];
    };
}

// 스튜디오 배경(카메라를 감싸는 큰 구): 벽 · 바닥 경계가 부드러운 밝은 스튜디오 → 끝에서 흑연색
const BACKDROP_VERT = /* glsl */`
varying vec3 vDir;
void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const BACKDROP_FRAG = /* glsl */`
uniform float uDusk; varying vec3 vDir;
void main() {
    float y = vDir.y;
    vec3 wall = mix(vec3(0.976, 0.982, 0.984), vec3(0.937, 0.945, 0.957), smoothstep(0.0, 0.55, y));
    vec3 flo = mix(vec3(0.949, 0.953, 0.965), vec3(0.925, 0.933, 0.945), smoothstep(-0.05, -0.6, y));
    vec3 c = mix(flo, wall, smoothstep(-0.07, 0.07, y));
    gl_FragColor = vec4(mix(c, vec3(0.0196), uDusk), 1.0);
}`;

// ---------------------------------------------------------
// 부팅
// ---------------------------------------------------------
function hasWebGL2() {
    try { return !!document.createElement('canvas').getContext('webgl2'); } catch { return false; }
}
function goStatic(reason) {
    section.classList.add('is-static');
    section.classList.remove('is-live');
    section.dataset.static = reason;
    delete section.dataset.tone;
    labels.forEach(l => l.removeAttribute('data-on'));
    window.__cine = { static: reason, settled: () => Promise.resolve(), stats: () => ({ static: reason }) };
}

if (section && canvas) {
    if (POSTER_MODE) document.documentElement.classList.add('cine-poster-mode');
    section.dataset.layout = profileFor(innerWidth, innerHeight);
    if (!POSTER_MODE && (reduced || saveData)) goStatic(reduced ? 'reduced-motion' : 'save-data');
    else if (!hasWebGL2()) goStatic('no-webgl');
    else boot().catch((err) => { console.warn('[cinematic] WebGL 초기화 실패 — 정적 포스터로 표시', err); goStatic('error'); });
}

function sensorMap() {
    // script.js(먼저 실행되는 일반 스크립트)의 전역 상수 — 체압 체험 · 분해도와 같은 콘셉트 배열을 그대로 사용
    try { return SENSOR_MAP; } catch { return []; }   // eslint-disable-line no-undef
}

async function boot() {
    const THREE = await loadThree();
    const narrow = innerWidth < 768;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: false, antialias: true, powerPreference: 'high-performance' });
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.VSMShadowMap;           // 넓고 부드러운 그림자 (흐림 반경 사용)
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(FOV, 1, 10, 60000);

    // ---------- 조명 ----------
    const hemi = new THREE.HemisphereLight(0xffffff, 0xc4c8cf, 1.45);
    const key = new THREE.DirectionalLight(0xffffff, 2.5);
    key.position.set(-650, 2700, 900);                          // 거의 위에서: 그림자가 물체 바로 아래에 모임
    key.target.position.set(0, 500, 0);
    key.castShadow = true;
    key.shadow.mapSize.set(narrow ? 1024 : 2048, narrow ? 1024 : 2048);
    Object.assign(key.shadow.camera, { left: -1000, right: 1000, top: 1100, bottom: -1000, near: 200, far: 5200 });
    key.shadow.radius = 14; key.shadow.blurSamples = 16; key.shadow.bias = -0.0006;
    const rim = new THREE.DirectionalLight(0xffffff, 1.1);
    rim.position.set(1300, 900, -1500);
    scene.add(hemi, key, key.target, rim);

    // ---------- 스튜디오 ----------
    const U = { dusk: { value: 0 } };
    const backdrop = new THREE.Mesh(new THREE.SphereGeometry(30000, 48, 24), new THREE.ShaderMaterial({ vertexShader: BACKDROP_VERT, fragmentShader: BACKDROP_FRAG, uniforms: { uDusk: U.dusk }, side: THREE.BackSide, depthWrite: false }));
    backdrop.renderOrder = -1;
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(8000, 8000), new THREE.ShadowMaterial({ opacity: 0.12 }));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
    scene.add(backdrop, ground);

    // ---------- 형상 도우미 ----------
    const CX = VB.w / 2, CY = VB.h / 2;
    function outlineShape() {
        const d = CUSHION_3D || document.querySelector('#cushionShape path')?.getAttribute('d') || OUTLINE_FALLBACK;
        const t = d.match(/[MCZ]|-?\d*\.?\d+/g), s = new THREE.Shape();
        let i = 0; const pt = () => [+t[i++] - CX, +t[i++] - CY];
        while (i < t.length) {
            const c = t[i++];
            if (c === 'M') s.moveTo(...pt());
            else if (c === 'C') { const a = pt(), b = pt(), e = pt(); s.bezierCurveTo(...a, ...b, ...e); }
            else if (c === 'Z') s.closePath();
        }
        return s;
    }
    // 평면 도형을 위로 돌출: 바닥이 y = 0. 도형 y(= 탑뷰 아래쪽 = 뒤쪽) → 월드 -z, 즉 탑뷰 위쪽(앞쪽)이 카메라(+z) 쪽
    function slab(shape, { depth, bevel = 0, size = bevel, segs = 6, scale = 1, curve = 72 }) {
        const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: size, bevelSegments: segs, curveSegments: curve });
        g.scale(scale, scale, 1);
        g.rotateX(-Math.PI / 2);
        g.translate(0, bevel, 0);
        return g;
    }
    function roundedRect(w, h, r) {
        const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
        s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
        s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
        s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
        return s;
    }
    const mesh = (g, m, { cast = true, receive = false } = {}) => { const o = new THREE.Mesh(g, m); o.castShadow = cast; o.receiveShadow = receive; return o; };

    // ---------- 방석: 01 커버 · 폼 + 내부 레이어 02–06 + 하부 셸(하우징) ----------
    const outline = outlineShape();
    const std = (color, roughness = 0.45, metalness = 0.1, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });
    const M = {
        shell: std(0x2b2c30, 0.52, 0.05),
        pad: std(0x5f6063, 0.84, 0),
        // 판 색 · 투명도: 하드웨어 섹션 분해도의 반투명 레이어(.plate-*, 불투명도 0.7–0.9)를 옮긴 것 → 아래 레이어의 부품이 비쳐 보임
        plate: Object.fromEntries(Object.entries({ sensor_array: 0x1d2129, haptic_motor: 0x1c1d24, main_pcb: 0x101c2c, ble_module: 0x161820, battery_power: 0x282a32 })
            .map(([k, c]) => [k, std(c, 0.4, 0.1, { transparent: true, opacity: 0.74, depthWrite: false })])),
        trace: std(0x46505f, 0.4, 0.3),
        node: std(0x29303d, 0.35, 0.2, { emissive: 0x2f6bff, emissiveIntensity: 0 }),
        motor: std(0xb89b66, 0.35, 0.7),                          // 분해도의 진동 모터 표기색(호박색 계열)
        board: std(0x24344a, 0.5, 0.2), chip: std(0x0b0c10, 0.35, 0.3),
        line: std(0x9aa4b5, 0.4, 0.2),
        battery: std(0xc4c9d2, 0.4, 0.55),                        // 분해도의 배터리 표기색(밝은 회색)
        led: std(0x0e1626, 0.3, 0, { emissive: 0x3d7bff, emissiveIntensity: 0.5 }),
    };
    const cushion = new THREE.Group();
    const shellH = SHELL.depth + SHELL.bevel * 2;
    const shell = mesh(slab(outline, { depth: SHELL.depth, bevel: SHELL.bevel, size: 9 }), M.shell, { receive: true });
    const pad = mesh(slab(outline, { depth: PAD.depth, bevel: PAD.bevel, size: 13, segs: 10, scale: PAD.scale }), M.pad, { receive: true });

    // 분해도 그림(viewBox 460×380) 좌표 → 판 위 로컬 좌표. 판과 같은 비율로 줄여 그림과 같은 배치를 유지
    const at = (o, sx, sy, y) => { o.position.set((sx - CX) * PLATE.scale, PLATE.depth + y, -(sy - CY) * PLATE.scale); return o; };
    const box = (w, h, d, m) => mesh(new THREE.BoxGeometry(w * PLATE.scale, h, d * PLATE.scale), m, { cast: false });
    const disc = (r, h, m) => mesh(new THREE.CylinderGeometry(r * PLATE.scale, r * PLATE.scale, h, 40), m, { cast: false });
    function arc(cx, cy, r, chordHalf, m) {                      // 분해도의 BLE 호: 중심(cx, cy) · 반지름 r · 현의 절반 → 앞쪽(+z)을 향한 호
        const A = 2 * Math.asin(chordHalf / r);
        const g = new THREE.TorusGeometry(r * PLATE.scale, 1.6, 8, 40, A);
        g.rotateZ(-Math.PI / 2 - A / 2); g.rotateX(-Math.PI / 2);
        return at(mesh(g, m, { cast: false }), cx, cy, 1.6);
    }
    const PARTS = ['sensor_array', 'haptic_motor', 'main_pcb', 'ble_module', 'battery_power'];
    const plates = PARTS.map((key) => {
        const g = new THREE.Group();
        g.add(mesh(slab(outline, { depth: PLATE.depth, scale: PLATE.scale }), M.plate[key], { receive: true }));
        return g;
    });
    // 02 압력센서: 가로 · 세로 배선 3줄 + 센서 점 (SENSOR_MAP)
    const [L2, L3, L4, L5, L6] = plates;
    for (const [x0, y0, x1, y1] of [[120, 167, 340, 167], [120, 274, 340, 274], [230, 167, 230, 330]]) {
        const horiz = y0 === y1, len = horiz ? x1 - x0 : y1 - y0;
        L2.add(at(box(horiz ? len : 3, 0.8, horiz ? 3 : len, M.trace), (x0 + x1) / 2, (y0 + y1) / 2, 0.4));
    }
    const nodes = sensorMap().map((s) => { const n = at(disc(9, 2.4, M.node), s.x / 100 * VB.w, s.y / 100 * VB.h, 1.2); L2.add(n); return n; });
    // 03 진동 모터: 코인 모터 2개 (166, 268) · (294, 268), 지름 48
    for (const x of [166, 294]) L3.add(at(disc(24, 6, M.motor), x, 268, 3));
    // 04 메인 제어 보드: 보드 108×74 (176, 140) + 칩 36×36 (212, 158)
    L4.add(at(box(108, 3, 74, M.board), 176 + 54, 140 + 37, 1.5), at(box(36, 4, 36, M.chip), 212 + 18, 158 + 18, 5));
    // 05 BLE 통신: 호 2개 + 점 (321, 152)
    L5.add(arc(321, 152, 30, 21, M.line), arc(321, 152, 17, 12, M.line), at(disc(5, 3, M.line), 321, 152, 1.5));
    // 06 배터리 · 전원: 배터리 124×58 (168, 226) + 단자 8×20 (292, 245)
    L6.add(at(box(124, 12, 58, M.battery), 168 + 62, 226 + 29, 6), at(box(8, 8, 20, M.battery), 292 + 4, 245 + 10, 4));

    // 전원 LED: 앞쪽 잘록한 곳의 가운데 벽 — 실제 렌더의 버튼 위치. 벽의 바깥 방향(법선)을 바라보게
    const ring400 = outline.getSpacedPoints(400);
    const fi = ring400.reduce((bi, p, i) => (p.y < 0 && Math.abs(p.x) < Math.abs(ring400[bi].x) ? i : bi), ring400.findIndex(p => p.y < 0));
    const fa = ring400[(fi + 399) % 400], fb = ring400[(fi + 1) % 400], front = ring400[fi];
    let nx = fb.y - fa.y, nz = fb.x - fa.x;                                  // 탑뷰 접선의 수직 → 월드 (x, z = -y)
    const nl = Math.hypot(nx, nz) || 1; nx /= nl; nz /= nl;
    if (nz < 0) { nx = -nx; nz = -nz; }                                      // 앞(카메라 쪽)을 향하도록
    const led = mesh(new THREE.CircleGeometry(4.5, 32), M.led, { cast: false });
    led.position.set(front.x + nx * 9.6, shellH * 0.5, -front.y + nz * 9.6);
    led.rotation.y = Math.atan2(nx, nz);
    const ledRing = mesh(new THREE.RingGeometry(6.5, 8, 40), M.led, { cast: false });
    ledRing.position.copy(led.position); ledRing.rotation.copy(led.rotation);
    const base = { shell: 0, plate: 6, pad: shellH - PAD_SINK };   // 조립 상태: 내부 판은 셸 안(보이지 않음)
    const edgeX = Math.max(...outline.getSpacedPoints(240).map(p => p.x));   // 외곽선 오른쪽 끝 (라벨 기준점)
    shell.add(led, ledRing);
    cushion.add(shell, ...plates, pad);
    scene.add(cushion);

    // ---------- 범용 사무용 의자 (특정 제품 아님) ----------
    const C = {
        fabric: new THREE.MeshStandardMaterial({ color: 0xd3d6dc, roughness: 0.92, transparent: true }),
        plastic: new THREE.MeshStandardMaterial({ color: 0xbabec6, roughness: 0.7, transparent: true }),
        metal: new THREE.MeshStandardMaterial({ color: 0xa9aeb6, roughness: 0.34, metalness: 0.55, transparent: true }),
    };
    const chair = new THREE.Group();
    const seatH = 64;
    const seat = mesh(slab(roundedRect(490, 460, 130), { depth: seatH - 28, bevel: 14, segs: 6, curve: 28 }), C.fabric, { receive: true });
    seat.position.y = SEAT_TOP - seatH;
    const plate = mesh(slab(roundedRect(420, 390, 110), { depth: 14, curve: 24 }), C.plastic);
    plate.position.y = SEAT_TOP - seatH - 14;
    const mech = mesh(new THREE.BoxGeometry(170, 46, 210), C.plastic); mech.position.y = SEAT_TOP - seatH - 14 - 23;
    const column = mesh(new THREE.CylinderGeometry(22, 22, 250, 32), C.metal); column.position.y = 240;
    const sleeve = mesh(new THREE.CylinderGeometry(33, 36, 150, 32), C.plastic); sleeve.position.y = 175;
    const hub = mesh(new THREE.CylinderGeometry(58, 62, 44, 40), C.plastic); hub.position.y = 98;
    chair.add(seat, plate, mech, column, sleeve, hub);
    const legGeo = new THREE.BoxGeometry(44, 30, 290); legGeo.translate(0, 0, 145);
    const casterGeo = new THREE.CylinderGeometry(26, 26, 22, 28); casterGeo.rotateZ(Math.PI / 2);
    for (let k = 0; k < 5; k++) {
        const a = (k * 72 + 36) * DEG;
        const leg = mesh(legGeo, C.plastic); leg.position.y = 92; leg.rotation.set(0, a, 0); leg.rotateX(7 * DEG);
        const caster = mesh(casterGeo, C.plastic); caster.position.set(Math.sin(a) * 300, 26, Math.cos(a) * 300); caster.rotation.y = a;
        chair.add(leg, caster);
    }
    const spine = mesh(new THREE.BoxGeometry(70, 280, 24), C.plastic); spine.position.set(0, SEAT_TOP + 110, -232); spine.rotation.x = -6 * DEG;
    const back = mesh(new THREE.ExtrudeGeometry(roundedRect(440, 500, 150), { depth: 26, bevelEnabled: true, bevelThickness: 10, bevelSize: 10, bevelSegments: 6, curveSegments: 28 }), C.fabric, { receive: true });
    back.position.set(0, SEAT_TOP + 420, -268); back.rotation.x = -9 * DEG;
    chair.add(spine, back);
    scene.add(chair);
    const chairMats = Object.values(C), chairMeshes = [];
    chair.traverse(o => { if (o.isMesh) chairMeshes.push(o); });

    // ---------- 카메라 ----------
    const pathOf = (keys) => [1, 2, 3, 4, 5].map(c => pchip(keys.map(k => k[0]), keys.map(k => k[c])));
    const camPaths = { wide: pathOf(CAM), tablet: pathOf(CAM), phone: pathOf(CAM_PHONE) };
    const target = new THREE.Vector3(), tmp = new THREE.Vector3();
    let view = { w: 1, h: 1 }, profile = '', start = { ax: 0.5, ay: 0.5, room: 1 };
    function layout() {
        profile = profileFor(innerWidth, innerHeight);
        section.dataset.layout = profile;
        const bottom = view.h - Math.max(52, view.h * 0.06);
        if (profile === 'wide') {
            // 넓은 화면: 카피는 왼쪽 열 → 의자는 내비게이션 아래 ~ 아래 여백 사이 전체 높이, 오른쪽 절반 가운데
            const top = 64 + Math.max(16, view.h * 0.03), room = bottom - top;
            start = { ax: START_AX.wide, ay: (top + room / 2) / view.h, room: room / view.h };
            return;
        }
        // 세로 · 좁은 화면: 카피(헤드라인 · 버튼) 아래 남는 공간에 놓음. transform과 무관한 offset 값으로 측정
        const copyBottom = copy ? copy.offsetTop + copy.offsetHeight : view.h * 0.4;
        const top = Math.min(copyBottom + Math.max(16, view.h * 0.02), view.h * 0.62);
        const room = Math.max(bottom - top, view.h * 0.3);
        let ayPx = top + room / 2;
        if (profile === 'phone') {
            // 휴대폰: 좌판 중심 구도라 등받이가 위로 길게 올라옴 → 등받이 윗끝이 카피(버튼 줄) 끝 + 14px에 오도록 좌판 위치를 정함.
            //   660 = 첫 구도에서 등받이 윗끝 ~ 방석 윗면 화면 거리(mm 환산, 실측). 좁아서 버튼이 두 줄이 되어도 겹치지 않음
            const pxPerMm = view.w / (2.08 * CAM_PHONE[0][5]);
            ayPx = clamp(copyBottom + 14 + 660 * pxPerMm, top + room / 2, bottom - 40);
        }
        start = { ax: START_AX[profile] ?? 0.5, ay: ayPx / view.h, room: room / view.h };
    }
    function cameraAt(p) {
        let [ty, r, az, el, rh] = camPaths[profile].map(f => f(p));
        const k = smooth(T.frame[0], T.frame[1], p);
        const fill = lerp(start.room, 1, k);                     // 시작: 카피 아래 공간에 맞춤
        const ay = lerp(start.ay, 0.5, k);
        const sk = smooth(T.side[0], T.side[1], p) * (1 - smooth(T.center[0], T.center[1], p));
        const ax = lerp(lerp(start.ax, 0.5, k), SIDE[profile].ax, sk);
        const retreat = lerp(1, SIDE[profile].r, sk);           // 라벨이 있는 동안만 조금 물러남 → 끝에서 다시 가까이
        r *= retreat; rh *= retreat;
        const vHalf = FOV * DEG / 2, hHalf = Math.atan(Math.tan(vHalf) * view.w / view.h);
        const dist = Math.max(r / Math.sin(Math.atan(Math.tan(vHalf) * fill)), rh / Math.sin(hHalf) * 1.04);
        target.set(0, ty, 0);
        camera.position.set(Math.sin(az * DEG) * Math.cos(el * DEG), Math.sin(el * DEG), Math.cos(az * DEG) * Math.cos(el * DEG)).multiplyScalar(dist).add(target);
        camera.lookAt(target);
        camera.setViewOffset(view.w, view.h, view.w * (0.5 - ax), view.h * (0.5 - ay), view.w, view.h);
        camera.updateProjectionMatrix(); camera.updateMatrixWorld();
        return dist;
    }

    // ---------- 장면 = 진행도의 순수 함수 ----------
    const phase = { lift: 0, chair: 0, explode: 0, sense: 0, labels: 0, dusk: 0 };
    function pose(p) {
        const lift = smooth(T.lift[0], T.lift[1], p);
        const out = smooth(T.chairOut[0], T.chairOut[1], p);
        const ex = smooth(T.explode[0], T.explode[1], p);
        const sense = smooth(T.sense[0], T.sense[1], p);
        const lab = smooth(T.labelsIn[0], T.labelsIn[1], p) * (1 - smooth(T.labelsOut[0], T.labelsOut[1], p));
        const dusk = smooth(T.dusk[0], T.dusk[1], p);
        Object.assign(phase, { lift, chair: out, explode: ex, sense, labels: lab, dusk });
        // 방석: 좌판 위 → 위로 떠오르며 앞쪽이 살짝 숙여져 윗면이 카메라를 향함 · 약간 돌아섬
        cushion.position.set(0, SEAT_TOP + 1 + LIFT * lift, 0);
        cushion.rotation.set(9 * DEG * lift - 3 * DEG * ex, -14 * DEG * lift + 6 * DEG * ex, 0);
        // 레이어: 조립 → 위아래로 분리
        shell.position.y = base.shell + EXPLODE.shell * ex;
        plates.forEach((g, i) => { g.position.y = base.plate + EXPLODE.plates[i] * ex; });   // 셸 안에서 차례로 빠져나옴
        pad.position.y = base.pad + EXPLODE.pad * ex;
        // 의자: 아래로 빠지며 투명해짐
        chair.position.y = -950 * out * out;
        const fade = 1 - smooth(0.55, 1, out);
        chairMats.forEach(m => { m.opacity = fade; });
        chair.visible = out < 0.999;
        chairMeshes.forEach(o => { o.castShadow = out < 0.35; });
        ground.material.opacity = 0.12 * (1 - lift) * (1 - dusk);
        // 센서 · LED
        M.node.emissiveIntensity = 1.5 * sense;                  // 02 압력센서 레이어 강조
        M.led.emissiveIntensity = 0.6 + 0.8 * sense;
        // 조명 · 배경
        U.dusk.value = dusk;
        hemi.intensity = 1.35 * (1 - 0.8 * dusk);
        key.intensity = 2.6 * (1 - 0.55 * dusk);
        rim.intensity = 1.1 * (1 + 0.6 * dusk);
    }

    // ---------- HTML 라벨 (01–06): 각 레이어 오른쪽 가장자리 → 가는 선 → 스택 오른쪽 열의 이름 ----------
    const ring = outline.getSpacedPoints(48);
    const toScreen = (v) => { v.project(camera); return { x: (v.x + 1) / 2 * view.w, y: (1 - v.y) / 2 * view.h }; };
    const layerEdges = [[pad, PAD.scale * 1.06, PAD.bevel], ...plates.map(g => [g, PLATE.scale, PLATE.depth])];
    function stackRight() {                                       // 모든 레이어 외곽의 화면상 오른쪽 끝
        let r = -Infinity;
        for (const [obj, sc, y] of [[shell, 1.04, shellH * 0.5], ...layerEdges]) {
            for (const q of ring) { tmp.set(q.x * sc, y, -q.y * sc); r = Math.max(r, toScreen(obj.localToWorld(tmp)).x); }
        }
        return r;
    }
    const anchorOf = ([obj, sc, y]) => { tmp.set(edgeX * sc - 6, y, -10); return toScreen(obj.localToWorld(tmp)); };
    const note = document.querySelector('.cine-label-note');
    // 첫 화면 리더선 라벨: 방석 윗면 가운데에 기준점 → 위로 꺾인 선 → 이름. 카피와 같은 진행도에서 사라짐
    function placeCallout(p) {
        if (!callout) return;
        const fade = 1 - smooth(T.copyOut[0], T.copyOut[1], p);
        callout.toggleAttribute('data-on', fade > 0.001);
        if (fade <= 0.001) return;
        tmp.set(0, SEAT_TOP + 46, 0);
        const a = toScreen(tmp);
        callout.style.setProperty('--cx', a.x.toFixed(1) + 'px');
        callout.style.setProperty('--cy', a.y.toFixed(1) + 'px');
        callout.style.setProperty('--on', fade.toFixed(3));
    }
    function placeLabels(on) {
        labels.forEach(el => el.toggleAttribute('data-on', on > 0.001));
        note?.toggleAttribute('data-on', on > 0.001);
        if (on <= 0.001) return;
        const narrowView = view.w < 600, gap = narrowView ? 22 : 26;
        const col = Math.min(stackRight() + (narrowView ? 14 : 36), view.w - 112);
        const pts = layerEdges.map(anchorOf);
        const ty = [];
        pts.forEach((a, i) => { ty[i] = i ? Math.max(a.y, ty[i - 1] + gap) : a.y; });   // 위에서 아래로, 겹치지 않게
        const over = ty[ty.length - 1] + gap * 1.6 - (view.h - 64);                    // 아래 넘침 → 전체를 위로
        if (over > 0) for (let i = 0; i < ty.length; i++) ty[i] -= over;
        labels.forEach((el, i) => {
            const a = pts[i]; if (!a) return;
            const dx = col - 6 - a.x, dy = ty[i] - a.y;
            el.style.setProperty('--ax', a.x.toFixed(1) + 'px');
            el.style.setProperty('--ay', a.y.toFixed(1) + 'px');
            el.style.setProperty('--len', Math.max(0, Math.hypot(dx, dy)).toFixed(1) + 'px');
            el.style.setProperty('--ang', Math.atan2(dy, dx).toFixed(4) + 'rad');
            el.style.setProperty('--tx', col.toFixed(1) + 'px');
            el.style.setProperty('--ty', ty[i].toFixed(1) + 'px');
            el.style.setProperty('--mw', Math.max(80, view.w - col - 10).toFixed(0) + 'px');
            el.style.setProperty('--on', on.toFixed(3));
        });
        if (note) {
            note.style.setProperty('--tx', col.toFixed(1) + 'px');
            note.style.setProperty('--ty', (ty[ty.length - 1] + gap * 1.25).toFixed(1) + 'px');
            note.style.setProperty('--mw', Math.max(80, view.w - col - 10).toFixed(0) + 'px');
            note.style.setProperty('--on', on.toFixed(3));
        }
    }

    function resize() {
        view = { w: innerWidth, h: innerHeight };
        renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
        renderer.setSize(view.w, view.h, false);
        camera.aspect = view.w / view.h;
        layout(); setTarget(readProgress());
    }

    // ---------- 스크롤 → 진행도 ----------
    let targetP = 0, shown = 0, lastT = performance.now(), raf = 0, live = false, lastTone = '';
    // 포스터 → 3D 전환 (첫 유효 프레임 기준): 전환하면서 고정 구간을 늘림(.is-live).
    //   히어로를 이미 지나 읽고 있던 사람(딥 링크 등)은 같은 내용 위치를 유지
    function goLive() {
        live = true;
        const before = section.offsetHeight, y = window.scrollY;
        section.classList.add('is-live');
        const added = section.offsetHeight - before, L = window.__hurryupLenis;
        L?.resize?.();
        if (added > 0 && y >= section.offsetTop + before) {
            if (L) L.scrollTo(y + added, { immediate: true, force: true }); else window.scrollTo({ top: y + added, behavior: 'instant' });
        }
        window.ScrollTrigger?.refresh?.();
        setTarget(readProgress());
    }
    function readProgress() {
        const len = section.offsetHeight - innerHeight;
        return len > 0 ? clamp(-section.getBoundingClientRect().top / len) : 0;
    }
    function setTarget(p) { targetP = p; kick(); }
    function kick() { if (!raf) raf = requestAnimationFrame(frame); }

    function overlays(p) {
        const out = smooth(T.copyOut[0], T.copyOut[1], p);
        copy?.style.setProperty('--out', out.toFixed(4));
        copy?.toggleAttribute('data-gone', out > 0.999);
        section.toggleAttribute('data-end', p > 0.97);           // 끝까지 오면 '인트로 건너뛰기'는 의미 없음 → 숨김
        const tone = phase.dusk > 0.5 ? 'dark' : 'light';        // 내비게이션 명암 전환용 (script.js)
        if (tone !== lastTone) { section.dataset.tone = tone; lastTone = tone; window.dispatchEvent(new CustomEvent('hurryup:tone', { detail: tone })); }
    }

    function frame(now) {
        raf = 0;
        const dt = Math.min(64, now - lastT); lastT = now;
        const tau = window.__hurryupLenis ? 0 : 70;              // Lenis가 이미 부드럽게 하면 추가 감쇠 없음 (터치 · Lenis 없음: 70ms)
        shown = tau ? shown + (targetP - shown) * (1 - Math.exp(-dt / tau)) : targetP;
        if (Math.abs(targetP - shown) < 1e-5) shown = targetP;
        pose(shown);
        cameraAt(shown);
        scene.updateMatrixWorld();
        renderer.render(scene, camera);
        placeLabels(phase.labels);
        placeCallout(shown);
        overlays(shown);
        if (!live) goLive();
        if (shown !== targetP) kick();
    }

    canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); goStatic('context-lost'); });   // 문맥 소실 → 포스터

    let rt = 0;
    addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(resize, 120); });
    if (!POSTER_MODE) addEventListener('scroll', () => setTarget(readProgress()), { passive: true });
    resize();
    shown = targetP;
    document.fonts?.ready.then(() => { layout(); kick(); });   // 웹폰트가 늦게 오면 카피 높이가 바뀜 → 시작 구도 다시 계산

    // 미리보기 · 포스터 · 점검 도구용 (tools/preview_cinematic.py)
    window.__cine = {
        get profile() { return profile; }, get lenis() { return window.__hurryupLenis || null; },
        get progress() { return shown; },
        settled() {
            return new Promise((resolve) => {
                const check = () => (live && !raf && shown === targetP) ? requestAnimationFrame(() => requestAnimationFrame(resolve)) : setTimeout(check, 50);
                kick(); setTimeout(check, 50);
            });
        },
        stats() {
            return {
                profile, progress: +shown.toFixed(4), tone: section.dataset.tone || '',
                cushionY: Math.round(cushion.position.y), gap: Math.round(pad.position.y - shell.position.y), spacing: plates.map((g, i) => Math.round((i ? plates[i - 1].position.y : pad.position.y) - g.position.y)),
                chairOpacity: +(1 - phase.chair).toFixed(3), labels: +phase.labels.toFixed(3), sensors: nodes.length, layers: plates.length + 1,
                cameraDist: Math.round(camera.position.distanceTo(target)), calls: renderer.info.render.calls, triangles: renderer.info.render.triangles,
            };
        },
    };
    kick();
}
