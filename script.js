/**
 * career.log — vanilla JS only, no build step, no dependencies.
 * 콘텐츠는 data/profile.json 에서 읽어 렌더링한다. (print.html 과 같은 데이터)
 */
import {
    STATUS_TAG,
    bars,
    elapsedNode,
    el,
    formatPeriod,
    loadProfile,
    statValue,
} from "./js/profile.js";

const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
).matches;

const MARKER = { ctx: " ", add: "+", rc: "~" };
const KIND_LABEL = {
    major: "메이저 릴리스, 소속 조직 변경.",
    minor: "마이너 릴리스, 큰 프로젝트.",
    patch: "패치 릴리스, 작은 프로젝트.",
};

/* ---------- render: data → DOM (기존 정적 마크업과 동일한 구조) ---------- */

/**
 * 스크린리더용 상태 문구.
 * @param {{status: string, level: number}} row
 * @returns {string}
 */
function skillSrLabel(row) {
    if (row.status === "ctx") return "(기존 보유)";
    if (row.status === "add") return "(신규 습득)";
    return row.level === 0 ? "(학습 예정)" : "(학습 중)";
}

function renderMeta(meta) {
    document.querySelectorAll("[data-bind]").forEach(function (node) {
        const value = meta[node.dataset.bind];
        if (typeof value === "string") node.textContent = value;
    });
}

function renderStats(container, stats, meta, now) {
    stats.forEach(function (stat) {
        const dd = el("dd", {}, statValue(stat, meta, now));
        if (stat.note) dd.append(el("span", { class: "stat-note" }, stat.note));
        container.append(el("div", { class: "stat" }, [el("dt", {}, stat.cmd), dd]));
    });
}

function renderSkills(container, skills) {
    skills.forEach(function (block) {
        const rows = block.rows.map(function (row) {
            const children = [
                el("span", { class: "marker", "aria-hidden": "true" }, MARKER[row.status]),
                el("span", { class: "name" }, [
                    row.name,
                    el("span", { class: "sr-only" }, skillSrLabel(row)),
                ]),
                el("span", { class: "bars", "aria-hidden": "true" }, bars(row.level)),
                el("span", { class: "note" }, row.note),
            ];
            if (row.courses && row.courses.length) {
                children.push(
                    el(
                        "ul",
                        { class: "courses" },
                        row.courses.map(function (course) {
                            return el("li", {}, [
                                course.label + " ",
                                el(
                                    "a",
                                    {
                                        href: course.url,
                                        target: "_blank",
                                        rel: "noopener noreferrer",
                                    },
                                    "(수료증)",
                                ),
                            ]);
                        }),
                    ),
                );
            }
            return el("li", { class: "diff-row " + row.status }, children);
        });
        container.append(
            el("div", { class: "diff-block" }, [
                el("p", { class: "diff-hunk" }, "@@ " + block.hunk + " @@"),
                el("ul", { class: "diff-list" }, rows),
            ]),
        );
    });
}

/**
 * 버전 문자열. verHi 가 있으면 해당 자리(0=major,1=minor,2=patch)를 강조한다.
 * @param {{ver: string, verHi?: number}} entry
 * @returns {HTMLElement}
 */
function verNode(entry) {
    if (entry.verHi === undefined) return el("span", { class: "ver" }, entry.ver);
    const parts = entry.ver.split(".");
    const children = [];
    parts.forEach(function (part, i) {
        if (i > 0) children.push(".");
        children.push(
            i === entry.verHi ? el("span", { class: "ver-hi" }, part) : part,
        );
    });
    return el("span", { class: "ver" }, children);
}

function renderChangelog(container, changelog, now) {
    changelog.forEach(function (entry) {
        const srText =
            KIND_LABEL[entry.kind] + (entry.jump ? " 팀 이동으로 자릿수 점프." : "");

        const head = el("div", { class: "log-head" }, [
            el("span", { class: "sr-only" }, srText),
            verNode(entry),
            el("span", { class: "tag tag-" + entry.status }, STATUS_TAG[entry.status]),
        ]);
        if (entry.start) {
            const time = el(
                "time",
                { datetime: entry.start },
                formatPeriod(entry.start, entry.end, "현재"),
            );
            const elapsed = elapsedNode(entry.start, entry.end, now);
            if (elapsed) time.append(elapsed);
            head.append(time);
        }

        const children = [];
        if (entry.note) {
            children.push(
                el("p", { class: "log-note" }, [
                    el("span", { "aria-hidden": "true" }, "#"),
                    " " + entry.note,
                ]),
            );
        }
        children.push(head, el("h3", { class: "log-title" }, entry.title));
        if (entry.body) children.push(el("p", { class: "log-body" }, entry.body));

        container.append(el("li", { class: "log-entry log-" + entry.kind }, children));
    });
}

function renderProjects(container, projects, now) {
    projects.forEach(function (project, i) {
        const n = i + 1;
        const period = el(
            "span",
            { class: "period" },
            formatPeriod(project.start, project.end, "present"),
        );
        const elapsed = elapsedNode(project.start, project.end, now);
        if (elapsed) period.append(elapsed);

        const toggle = el(
            "button",
            {
                class: "repo-toggle",
                "aria-expanded": "false",
                "aria-controls": "star-" + n,
                id: "toggle-" + n,
            },
            [
                el("div", { class: "repo-top" }, [
                    el("span", { class: "repo-name" }, project.repo),
                    el("span", { class: "badge badge-" + project.status }, project.status),
                ]),
                el("p", { class: "repo-desc" }, project.desc),
                el(
                    "div",
                    { class: "repo-meta" },
                    project.tech
                        .map(function (t) {
                            return el("span", { class: "tech" }, t);
                        })
                        .concat(period),
                ),
                el("span", { class: "expand-hint" }, [
                    "STAR 상세 보기 ",
                    el("span", { class: "chev", "aria-hidden": "true" }, "›"),
                ]),
            ],
        );

        const dl = el(
            "dl",
            {},
            ["s", "t", "a", "r"].flatMap(function (key) {
                return [
                    el("dt", {}, key.toUpperCase()),
                    el("dd", {}, project.star[key]),
                ];
            }),
        );
        const panel = el(
            "div",
            {
                class: "repo-star",
                id: "star-" + n,
                role: "region",
                "aria-labelledby": "toggle-" + n,
                hidden: true,
            },
            dl,
        );

        container.append(el("article", { class: "repo-card" }, [toggle, panel]));
    });
}

function renderError(containers, message) {
    containers.forEach(function (container) {
        if (!container) return;
        container.replaceChildren(
            el("p", { class: "load-error", role: "alert" }, message),
        );
    });
}

async function render() {
    const stats = document.getElementById("stats");
    const skills = document.getElementById("skills-blocks");
    const log = document.getElementById("log-list");
    const repos = document.getElementById("repo-grid");

    let data;
    try {
        data = await loadProfile();
    } catch (err) {
        console.error(err);
        renderError(
            [stats, skills, log, repos],
            "데이터를 불러오지 못했습니다. 잠시 후 새로고침 해주세요.",
        );
        return;
    }

    const now = new Date();
    renderMeta(data.meta);
    renderStats(stats, data.stats, data.meta, now);
    renderSkills(skills, data.skills);
    renderChangelog(log, data.changelog, now);
    renderProjects(repos, data.projects, now);
}

/* ---------- build date footer ---------- */
function renderBuildDate() {
    const node = document.getElementById("build-date");
    if (!node) return;
    const today = new Date();
    const pad = function (n) {
        return String(n).padStart(2, "0");
    };
    node.textContent =
        today.getFullYear() +
        "-" +
        pad(today.getMonth() + 1) +
        "-" +
        pad(today.getDate());
}

/* ---------- copy email to clipboard ---------- */
function initCopyButton() {
    const btn = document.getElementById("copy-btn");
    const email = document.getElementById("email");
    const feedback = document.getElementById("copy-feedback");
    if (!btn || !email) return;

    btn.addEventListener("click", function () {
        const text = email.textContent.trim();

        function showCopied() {
            btn.textContent = "copied";
            if (feedback) feedback.textContent = "이메일이 복사되었습니다.";
            window.setTimeout(function () {
                btn.textContent = "copy";
                if (feedback) feedback.textContent = "";
            }, 1800);
        }

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(showCopied, function () {
                if (feedback)
                    feedback.textContent =
                        "복사에 실패했습니다. 직접 선택해 복사해주세요.";
            });
        } else {
            const range = document.createRange();
            range.selectNode(email);
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
            try {
                document.execCommand("copy");
                showCopied();
            } catch (err) {
                if (feedback)
                    feedback.textContent =
                        "복사에 실패했습니다. 직접 선택해 복사해주세요.";
            }
            selection.removeAllRanges();
        }
    });
}

/* ---------- expandable project STAR panels ---------- */
function initRepoToggles() {
    const toggles = document.querySelectorAll(".repo-toggle");
    toggles.forEach(function (btn) {
        btn.addEventListener("click", function () {
            const panelId = btn.getAttribute("aria-controls");
            const panel = document.getElementById(panelId);
            if (!panel) return;
            const expanded = btn.getAttribute("aria-expanded") === "true";
            btn.setAttribute("aria-expanded", String(!expanded));
            panel.hidden = expanded;
        });
    });
}

/* ---------- scroll reveal ---------- */
function initScrollReveal() {
    const targets = document.querySelectorAll(
        ".log-entry:not(.log-patch), .repo-card",
    );

    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
        targets.forEach(function (node) {
            node.classList.add("in-view");
        });
        return;
    }

    const observer = new IntersectionObserver(
        function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add("in-view");
                    observer.unobserve(entry.target);
                }
            });
        },
        { threshold: 0.15, rootMargin: "0px 0px -40px 0px" },
    );

    targets.forEach(function (node) {
        observer.observe(node);
    });
}

/* ---------- highlight nav link for section in view ---------- */
function initScrollSpy() {
    const sectionIds = ["skills", "career", "projects", "contact"];
    const links = {};
    sectionIds.forEach(function (id) {
        const link = document.querySelector('.toplinks a[href="#' + id + '"]');
        if (link) links[id] = link;
    });
    const sections = sectionIds
        .map(function (id) {
            return document.getElementById(id);
        })
        .filter(Boolean);
    if (!sections.length || !("IntersectionObserver" in window)) return;

    function setActive(id) {
        sectionIds.forEach(function (sid) {
            const link = links[sid];
            if (!link) return;
            if (sid === id) {
                link.classList.add("active");
                link.setAttribute("aria-current", "true");
            } else {
                link.classList.remove("active");
                link.removeAttribute("aria-current");
            }
        });
    }

    const observer = new IntersectionObserver(
        function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    setActive(entry.target.id);
                }
            });
        },
        { rootMargin: "-45% 0px -50% 0px", threshold: 0 },
    );

    sections.forEach(function (node) {
        observer.observe(node);
    });

    // the last section (contact) can be shorter than the viewport, so
    // its own bounds may never cross the mid-page band above — treat
    // hitting the bottom of the page as "viewing" it explicitly.
    const lastId = sectionIds[sectionIds.length - 1];
    let ticking = false;
    function checkBottom() {
        ticking = false;
        const atBottom =
            window.innerHeight + window.scrollY >=
            document.documentElement.scrollHeight - 2;
        if (atBottom) setActive(lastId);
    }
    window.addEventListener(
        "scroll",
        function () {
            if (ticking) return;
            ticking = true;
            window.requestAnimationFrame(checkBottom);
        },
        { passive: true },
    );
    checkBottom();
}

/* ---------- accessible anchor focus on nav click ---------- */
function initAnchorFocus() {
    const links = document.querySelectorAll(
        '.toplinks a[href^="#"], .brand[href^="#"]',
    );
    links.forEach(function (link) {
        link.addEventListener("click", function () {
            const id = link.getAttribute("href").slice(1);
            const target = document.getElementById(id);
            if (!target) return;
            target.setAttribute("tabindex", "-1");
            window.setTimeout(
                function () {
                    target.focus({ preventScroll: true });
                },
                prefersReducedMotion ? 0 : 400,
            );
        });
    });
}

// ES module 은 문서 파싱이 끝난 뒤 실행되므로 DOM 을 바로 사용할 수 있다.
async function main() {
    renderBuildDate();
    initCopyButton();
    initAnchorFocus();
    await render(); // 동적 생성되는 요소에 의존하는 init 은 렌더 이후에 실행
    initRepoToggles();
    initScrollReveal();
    initScrollSpy();
}

main();
