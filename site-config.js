/* =========================================================
   허리업 (HURRY UP) — 사이트 설정 (단일 수정 지점)
   ---------------------------------------------------------
   · 문의 폼 백엔드, 개인정보 안내, 하드웨어 사양, 갤러리 사진을
     이 파일 하나에서만 수정합니다. (script.js는 건드릴 필요 없음)
   · 이 파일이 로드되지 않아도 사이트는 동작합니다
     (폼은 '전송 안 됨' 모드, 사양은 '미확정'으로 표시).
   ========================================================= */
window.HURRYUP_CONFIG = {

    // -----------------------------------------------------
    // 1. 문의 폼
    // -----------------------------------------------------
    contact: {
        // 비어 있으면 아무것도 전송하지 않고, 작성 내용 복사만 제공합니다.
        // 예) Formspree: 'https://formspree.io/f/xxxxxxx'
        //     Web3Forms: 'https://api.web3forms.com/submit'
        //     자체 API / Cloudflare Worker: 'https://api.example.com/inquiry'
        endpoint: '',
        format: 'json',          // 'json' (Content-Type: application/json) | 'form' (multipart FormData)
        extraFields: {},         // 서비스가 요구하는 고정 필드. 예) Web3Forms: { access_key: '…' }
        subject: '[허리업] 웹사이트 문의',

        // 스팸 방지 (기본: 숨김 필드 + 최소 작성 시간 + 재전송 대기)
        minFillSeconds: 4,       // 폼을 처음 만진 뒤 이 시간 안에 제출되면 차단 (봇 방지)
        cooldownSeconds: 60,     // 접수 성공 후 같은 탭에서 재전송 대기
        timeoutMs: 15000,
        // 선택: Cloudflare Turnstile 사이트 키 (서버에서 토큰 검증 필요)
        turnstileSiteKey: ''
    },

    // -----------------------------------------------------
    // 2. 개인정보 안내
    //    ⚠ endpoint를 넣어도 아래 세 항목(controller · contactEmail · retention)이
    //      비어 있으면 실제 전송은 활성화되지 않습니다.
    // -----------------------------------------------------
    privacy: {
        controller: '',          // 개인정보 처리 주체. 예) '허리업 팀 (대표 ○○○)'
        contactEmail: '',        // 개인정보 · 삭제 요청 연락처
        retention: '',           // 보유 기간. 예) '문의 처리 완료 후 1년 이내 파기'
        processor: ''            // 처리 위탁 · 국외 이전. 예) 'Formspree Inc. (미국) — 문의 수신·저장'
    },

    // -----------------------------------------------------
    // 3. 하드웨어 사양 (잠정)
    //    status: '확정' | '검토 중' | '설계 중' | '설계 목표' | '목표 · 미측정' | '콘셉트' | '개발 중' | '미확정' | '미검증'
    //    · '확정'은 confirmedBy(근거 문서: 도면 번호, BOM 버전, 시험 성적서 등)가 있어야만 표시됩니다.
    //      근거가 비어 있으면 자동으로 '미확정'으로 표시됩니다.
    //    · value: 하드웨어 사양표에 표시되는 문구 / short: 본문 요약 문구
    // -----------------------------------------------------
    specs: {
        // 외피 · 폼
        foamMaterial: { label: '구성', value: '메모리폼 계열 + 통기성 메시 커버', status: '검토 중' },
        cover:        { label: '커버', value: '지퍼 분리형', status: '설계 목표' },
        dimensions:   { label: '규격', value: '자료별 440×380×75mm / 480×430mm로 상이', status: '미확정', confirmedBy: '' },
        // 센싱
        sensorType:   { label: '방식', value: 'FSR 압력 센서', status: '검토 중' },
        sensorCount:  { label: '포인트 수', value: '자료별 4 · 9 · 12포인트로 상이', short: '포인트 수 검토 중', status: '미확정', confirmedBy: '' },
        // 진동
        motor:        { label: '방식', value: 'LRA 코인 진동 모터 (후보)', status: '검토 중', confirmedBy: '' },
        motorDriver:  { label: '드라이버', value: '자료별 DRV2605L / DRV8833으로 상이', status: '미확정', confirmedBy: '' },
        motorCount:   { label: '수량 · 위치', value: '미확정', status: '미확정', confirmedBy: '' },
        noise:        { label: '소음', value: '35dB 미만', short: '35dB 미만 목표', status: '목표 · 미측정' },
        // 제어 · 통신
        mcu:          { label: 'MCU', value: 'BLE 내장 MCU — 자료별 nRF52840 / ESP32로 상이', status: '미확정', confirmedBy: '' },
        standalone:   { label: '동작', value: '방석 단독 판정 · 진동 제어', status: '설계 목표' },
        certification:{ label: '인증', value: 'KC 등 인증 준비', status: '미검증', confirmedBy: '' },
        bleSpec:      { label: '규격', value: 'Bluetooth Low Energy', status: '검토 중' },
        bleModule:    { label: '구성', value: 'MCU 내장 여부 검토 중', status: '미확정' },
        appPlatform:  { label: '앱', value: 'iOS · Android', status: '개발 중' },
        // 전원
        charging:     { label: '충전', value: 'USB-C', status: '설계 중' },
        chargerIc:    { label: '충전 IC', value: '자료별 BQ24075 / IP2326으로 상이', status: '미확정', confirmedBy: '' },
        battery:      { label: '배터리', value: '리튬 계열 — 용량은 자료별 상이 (3.7V 2000mAh / 11.1V 3000mAh / 800–1200mAh)', short: '용량 검토 중', status: '미확정', confirmedBy: '' },
        runtime:      { label: '사용 시간', value: '미정', status: '미확정', confirmedBy: '' },
        powerControl: { label: '전원 조작', value: '자료별 슬라이드 스위치 / 푸시 버튼으로 상이', status: '미확정', confirmedBy: '' },
        // 가격 — public: true + '확정' + confirmedBy가 모두 있어야 화면에 표시됩니다.
        price:        { label: '가격', value: '', status: '미확정', confirmedBy: '', public: false }
    },

    // -----------------------------------------------------
    // 4. 갤러리 실사 슬롯
    //    src가 비어 있으면 '사진 준비 중' 자리 표시가 유지됩니다.
    //    사진 준비: python tools/prep_photo.py <slot> <원본.jpg>  → 아래에 붙여 넣을 설정이 출력됩니다.
    //    ⚠ 실제 시제품을 촬영한 사진만 넣으세요. (렌더·스톡 이미지는 kind를 바꿔 구분)
    // -----------------------------------------------------
    gallery: {
        side: {         // 측면 프로필 — 3:1, 권장 2400×800 이상
            src: '', srcset: '', width: 2400, height: 800,
            alt: '', caption: '측면 프로필', kind: '실사'
        },
        material: {     // 쿠션 소재 클로즈업 — 4:3, 권장 1600×1200 이상
            src: '', srcset: '', width: 1600, height: 1200,
            alt: '', caption: '쿠션 소재', kind: '실사'
        },
        pcb: {          // 내부 PCB · 진동 모터 — 4:3, 권장 1600×1200 이상
            src: '', srcset: '', width: 1600, height: 1200,
            alt: '', caption: 'PCB · 진동 모터', kind: '실사'
        }
    }
};
