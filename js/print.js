/**
 * print.html — A4 이력서 렌더러.
 * index.html 과 같은 data/profile.json 을 읽어, 인터랙션 없이 모든 내용을 펼쳐서 그린다.
 */
import {
    STATUS_TAG,
    bars,
    el,
    elapsedNode,
    formatMonths,
    formatPeriod,
    loadProfile,
    monthsSince,
    parseVer,
    statValue,
} from "./profile.js";

const MARKER = { ctx: " ", add: "+", rc: "~" };
const STAR_LABEL = {
    s: ["S", "상황"],
    t: ["T", "과제"],
    a: ["A", "행동"],
    r: ["R", "결과"],
};
const FONT_WAIT_MS = 4000; // 폐쇄망 등에서 CDN 폰트가 막혀도 인쇄가 멈추지 않도록

/* ---------- sections ---------- */

function renderHeader(meta, stats, now) {
    const header = el("header", { class: "r-head" }, [
        el("div", { class: "r-id" }, [
            el("h1", { class: "r-name" }, meta.name),
            el("p", { class: "r-role" }, [
                el("span", {}, meta.roleFrom),
                el("span", {}, [
                    el("span", { class: "r-arrow", "aria-hidden": "true" }, "→ "),
                    meta.roleTo,
                ]),
            ]),
        ]),
        el("ul", { class: "r-contact" }, [
            el("li", {}, el("a", { href: "mailto:" + meta.email }, meta.email)),
            el(
                "li",
                {},
                el("a", { href: meta.siteUrl }, meta.siteUrl.replace(/^https?:\/\//, "")),
            ),
        ]),
    ]);

    const statBox = el(
        "dl",
        { class: "r-stats", "aria-label": "경력 지표" },
        stats.map(function (stat) {
            const dd = el("dd", {}, statValue(stat, meta, now));
            if (stat.note) dd.append(el("span", { class: "r-stat-note" }, stat.note));
            return el("div", { class: "r-stat" }, [el("dt", {}, stat.cmd), dd]);
        }),
    );
    return [header, statBox];
}

function sectionTitle(eyebrow, title, ext) {
    return el("h2", { class: "r-h2" }, [
        el("span", { class: "r-eyebrow" }, eyebrow),
        title,
        ext ? el("span", { class: "r-ext" }, ext) : null,
    ]);
}

function renderSkills(skills) {
    const legend = el("p", { class: "r-legend" }, [
        el("span", {}, [el("b", { class: "mk" }, " "), "변화 없음 · 기존 보유"]),
        el("span", { class: "add" }, [el("b", { class: "mk" }, "+"), "새로 습득"]),
        el("span", { class: "rc" }, [el("b", { class: "mk" }, "~"), "학습 · 예정"]),
        el("span", { class: "lv" }, "숙련도 ▮▮▮ 상 · ▮▮▯ 중 · ▮▯▯ 초급 · ▯▯▯ 예정"),
    ]);

    const hunks = skills.map(function (block) {
        const rows = block.rows.map(function (row) {
            const note = el("td", { class: "nt" }, row.note);
            if (row.courses && row.courses.length) {
                note.append(
                    el(
                        "ul",
                        { class: "courses" },
                        row.courses.map(function (c) {
                            return el("li", {}, [
                                c.label + " ",
                                el("a", { href: c.url }, "(수료증)"),
                            ]);
                        }),
                    ),
                );
            }
            return el("tr", { class: row.status }, [
                el("td", { class: "mk" }, MARKER[row.status]),
                el("td", { class: "nm" }, row.name),
                el("td", { class: "lv" }, bars(row.level)),
                note,
            ]);
        });
        return el("div", { class: "hunk" }, [
            el("h3", { class: "hunk-h" }, "@@ " + block.hunk + " @@"),
            el("table", { class: "r-table" }, [
                el("colgroup", {}, [
                    el("col", { class: "c-mk" }),
                    el("col", { class: "c-nm" }),
                    el("col", { class: "c-lv" }),
                    el("col"),
                ]),
                el("tbody", {}, rows),
            ]),
        ]);
    });

    return el("section", { class: "r-sec" }, [
        sectionTitle("01", "skills", ".diff"),
        legend,
        ...hunks,
    ]);
}

/**
 * 변경 이력을 [조직 → 프로젝트 그룹(minor/major) → 하위 patch] 로 묶는다.
 * 같은 major.minor 의 patch 는 해당 .0 항목 아래로 들어간다.
 * @param {Array<object>} changelog 최신순 배열
 * @param {Array<object>} orgs
 * @returns {Array<{org: object, groups: Array<{head: object, patches: object[]}>}>}
 */
function groupCareer(changelog, orgs) {
    return orgs.map(function (org) {
        const entries = changelog.filter(function (e) {
            return parseVer(e.ver).major === org.major;
        });
        const groups = [];
        entries.forEach(function (e) {
            if (parseVer(e.ver).patch === 0) groups.push({ head: e, patches: [] });
        });
        entries.forEach(function (e) {
            const v = parseVer(e.ver);
            if (v.patch === 0) return;
            const owner = groups.find(function (g) {
                const h = parseVer(g.head.ver);
                return h.major === v.major && h.minor === v.minor;
            });
            if (owner) owner.patches.push(e);
            else groups.push({ head: e, patches: [] }); // 소속 없는 patch 는 단독 표기
        });
        return { org, groups };
    });
}

function periodText(entry, now) {
    const text = formatPeriod(entry.start, entry.end, "현재");
    if (!text) return "";
    const elapsed = elapsedNode(entry.start, entry.end, now);
    return elapsed ? text + elapsed.textContent : text;
}

function renderCareer(profile, now) {
    const blocks = groupCareer(profile.changelog, profile.orgs).map(function (item) {
        const { org, groups } = item;
        let orgPeriod = formatPeriod(org.start, org.end, "현재");
        if (org.end === "present") {
            orgPeriod += " (" + formatMonths(monthsSince(org.start, now)) + ")";
        }

        const projects = groups.map(function (g) {
            const e = g.head;
            const children = [];
            if (e.note) children.push(el("p", { class: "proj-note" }, "# " + e.note));
            children.push(
                el("div", { class: "proj-head" }, [
                    el("span", { class: "ver" }, e.ver),
                    el("span", { class: "tag tag-" + e.status }, STATUS_TAG[e.status]),
                    el("h4", { class: "proj-title" }, e.title),
                    el("span", { class: "proj-period" }, periodText(e, now)),
                ]),
            );
            if (e.body) children.push(el("p", { class: "proj-body" }, e.body));
            if (g.patches.length) {
                children.push(
                    el("div", { class: "patches" }, [
                        el("p", { class: "patches-h" }, "기타 작업"),
                        el(
                            "ul",
                            {},
                            g.patches.map(function (p) {
                                const period = periodText(p, now);
                                return el("li", {}, [
                                    el("span", { class: "ver" }, p.ver),
                                    " " + p.title,
                                    period ? el("span", { class: "pp" }, " · " + period) : null,
                                ]);
                            }),
                        ),
                    ]),
                );
            }
            return el("li", { class: "proj proj-" + e.kind }, children);
        });

        return el("div", { class: "org" }, [
            el("div", { class: "org-head" }, [
                el("h3", { class: "org-name" }, org.name),
                el("span", { class: "org-role" }, org.role),
                el("span", { class: "org-period" }, orgPeriod),
            ]),
            el("ol", { class: "proj-list" }, projects),
        ]);
    });

    return el("section", { class: "r-sec" }, [
        sectionTitle("02", "CHANGELOG", ".md"),
        el(
            "p",
            { class: "r-note" },
            "소속 조직 · 프로젝트 단위의 경력 로그입니다. 경력 집계는 2021-02 첫 입사부터이며 국비과정은 경력에 포함하지 않았습니다. 일부 소규모 프로젝트는 기간 기록이 남아있지 않아 제목만 표기했습니다. 버전 표기: v<major>.<minor>.<patch> = 소속 조직 · 큰 프로젝트 · 작은 프로젝트.",
        ),
        ...blocks,
    ]);
}

function renderProjects(projects, now) {
    const cards = projects.map(function (p) {
        const period = formatPeriod(p.start, p.end, "present");
        const elapsed = elapsedNode(p.start, p.end, now);
        return el("article", { class: "star-card" }, [
            el("div", { class: "star-head" }, [
                el("h3", { class: "repo" }, p.repo),
                el("span", { class: "badge badge-" + p.status }, p.status),
                el("span", { class: "star-period" }, [period, elapsed]),
            ]),
            el("p", { class: "star-desc" }, p.desc),
            el(
                "p",
                { class: "star-tech" },
                p.tech.map(function (t) {
                    return el("span", { class: "tech" }, t);
                }),
            ),
            el(
                "dl",
                { class: "star-grid" },
                ["s", "t", "a", "r"].map(function (key) {
                    return el("div", { class: "star-row" }, [
                        el("dt", {}, [
                            STAR_LABEL[key][0],
                            el("small", {}, STAR_LABEL[key][1]),
                        ]),
                        el("dd", {}, p.star[key]),
                    ]);
                }),
            ),
        ]);
    });
    return el("section", { class: "r-sec r-sec-projects" }, [
        sectionTitle("03", "pinned"),
        ...cards,
    ]);
}

function renderFooter(meta, now) {
    const pad = function (n) {
        return String(n).padStart(2, "0");
    };
    const date =
        now.getFullYear() + "-" + pad(now.getMonth() + 1) + "-" + pad(now.getDate());
    return el(
        "footer",
        { class: "r-foot" },
        "생성일 " + date + " · " + meta.siteUrl.replace(/^https?:\/\//, ""),
    );
}

/* ---------- print ---------- */

/** 웹폰트 로딩을 기다린다. 막힌 환경에서도 FONT_WAIT_MS 후에는 진행한다. */
async function waitForFonts() {
    if (!document.fonts) return;
    const loading = document.fonts
        .load('400 10pt "Pretendard Variable"')
        .then(function () {
            return document.fonts.ready;
        })
        .catch(function () {});
    const timeout = new Promise(function (resolve) {
        window.setTimeout(resolve, FONT_WAIT_MS);
    });
    await Promise.race([loading, timeout]);
}

async function main() {
    const root = document.getElementById("resume");
    document.getElementById("print-btn").addEventListener("click", function () {
        window.print();
    });

    let profile;
    try {
        profile = await loadProfile();
    } catch (err) {
        console.error(err);
        root.replaceChildren(
            el(
                "p",
                { class: "r-loading", role: "alert" },
                "데이터를 불러오지 못했습니다. 잠시 후 새로고침 해주세요.",
            ),
        );
        return;
    }

    const now = new Date();
    document.title = profile.meta.name + " · 이력서";
    root.replaceChildren(
        ...renderHeader(profile.meta, profile.stats, now),
        renderSkills(profile.skills),
        renderCareer(profile, now),
        renderProjects(profile.projects, now),
        renderFooter(profile.meta, now),
    );

    if (new URLSearchParams(location.search).get("print") === "1") {
        await waitForFonts();
        window.print();
    }
}

main();
