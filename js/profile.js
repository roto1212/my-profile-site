/**
 * career.log 공용 모듈 — index.html / print.html 이 같은 데이터를 렌더링하도록
 * 데이터 로딩, 날짜 계산, DOM 헬퍼를 한곳에 둔다. (no build step, no dependencies)
 */

const DATA_URL = "data/profile.json";

export const STATUS_TAG = {
    done: "released",
    rc: "in progress",
    planned: "planned",
};

/**
 * profile.json 을 불러온다.
 * @returns {Promise<object>} 프로필 데이터
 * @throws {Error} 네트워크 오류 또는 HTTP 오류 시
 */
export async function loadProfile() {
    const res = await fetch(DATA_URL, { cache: "no-cache" });
    if (!res.ok) {
        throw new Error("profile.json 로드 실패 (HTTP " + res.status + ")");
    }
    return res.json();
}

/* ---------- DOM helper (textContent 기반 — innerHTML 미사용) ---------- */

/**
 * 요소를 생성한다. 문자열 자식은 텍스트 노드로 추가되므로 XSS 위험이 없다.
 * @param {string} tag 태그명
 * @param {Record<string, string|boolean|null|undefined>} [attrs] 속성 (class 포함)
 * @param {Array<Node|string|null|false>|Node|string} [children] 자식
 * @returns {HTMLElement}
 */
export function el(tag, attrs, children) {
    const node = document.createElement(tag);
    Object.entries(attrs || {}).forEach(function ([key, value]) {
        if (value === null || value === undefined || value === false) return;
        node.setAttribute(key, value === true ? "" : value);
    });
    [].concat(children === undefined ? [] : children).forEach(function (child) {
        if (child === null || child === undefined || child === false) return;
        node.append(child);
    });
    return node;
}

/* ---------- date helpers ---------- */

/**
 * "YYYY-MM" 또는 "YYYY-MM-DD" 를 Date 로 변환한다. (일자 생략 시 1일)
 * @param {string} value
 * @returns {Date}
 */
export function parseDate(value) {
    const [y, m, d] = value.split("-").map(Number);
    return new Date(y, m - 1, d || 1);
}

/**
 * start ~ end 사이의 근속 기간 문구. 예) "약 4년 8개월"
 * @param {Date} start
 * @param {Date} end
 * @returns {string}
 */
export function formatTenure(start, end) {
    let years = end.getFullYear() - start.getFullYear();
    let months = end.getMonth() - start.getMonth();
    if (end.getDate() < start.getDate()) months -= 1;
    if (months < 0) {
        years -= 1;
        months += 12;
    }
    return "약 " + years + "년 " + months + "개월";
}

/**
 * 개월 수를 "N년 N개월" 로 표기한다.
 * @param {number} total 개월 수
 * @returns {string}
 */
export function formatMonths(total) {
    if (total < 1) return "1개월 미만";
    const years = Math.floor(total / 12);
    const months = total % 12;
    const parts = [];
    if (years) parts.push(years + "년");
    if (months) parts.push(months + "개월");
    return parts.join(" ");
}

/**
 * "YYYY-MM" 시작월부터 now 까지의 경과 개월 수 (시작 전이면 음수).
 * @param {string} start "YYYY-MM"
 * @param {Date} now
 * @returns {number}
 */
export function monthsSince(start, now) {
    const [y, m] = start.split("-").map(Number);
    return now.getFullYear() * 12 + now.getMonth() - (y * 12 + m - 1);
}

/**
 * 기간 표기. 예) "2026.05 – 현재", "2021.11 – 2022.03", "2026.08"
 * @param {string} [start] "YYYY-MM"
 * @param {string} [end] "YYYY-MM" | "present"
 * @param {string} [presentLabel] end 가 "present" 일 때의 표기
 * @returns {string} start 가 없으면 빈 문자열
 */
export function formatPeriod(start, end, presentLabel) {
    if (!start) return "";
    const from = start.replace("-", ".");
    if (!end || end === start) return from;
    const to = end === "present" ? presentLabel || "현재" : end.replace("-", ".");
    return from + " – " + to;
}

/**
 * 진행 중("present") 기간 뒤에 붙이는 경과 표기 노드. 해당 없으면 null.
 * @param {string} [start]
 * @param {string} [end]
 * @param {Date} now
 * @returns {HTMLElement|null}
 */
export function elapsedNode(start, end, now) {
    if (!start || end !== "present") return null;
    const total = monthsSince(start, now);
    if (total < 0) return null; // 아직 시작 전
    return el("span", { class: "period-elapsed" }, " (" + formatMonths(total) + ")");
}

/**
 * 숙련도(0~3)를 막대 문자열로 변환한다. 예) 2 → "▮▮▯"
 * @param {number} level
 * @returns {string}
 */
export function bars(level) {
    return "▮".repeat(level) + "▯".repeat(3 - level);
}

/**
 * "v2.11.4" → { major, minor, patch }
 * @param {string} ver
 * @returns {{major: number, minor: number, patch: number}}
 */
export function parseVer(ver) {
    const [major, minor, patch] = ver.replace(/^v/, "").split(".").map(Number);
    return { major, minor, patch };
}

/**
 * stats 항목의 표시 값. tenure 타입이면 now 기준으로 계산한다.
 * @param {{type?: string, from?: string, value?: string}} stat
 * @param {object} meta profile.meta
 * @param {Date} now
 * @returns {string}
 */
export function statValue(stat, meta, now) {
    if (stat.type === "tenure") return formatTenure(parseDate(meta[stat.from]), now);
    return stat.value;
}
