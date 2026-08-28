/**
 * career.log — vanilla JS only, no build step, no dependencies.
 */
(function () {
    "use strict";

    var prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
    ).matches;

    /* ---------- live tenure stats ---------- */
    var CAREER_START = new Date(2021, 1, 1); // 2021-02, 웹비즈크리에이티브 입사
    var CURRENT_START = new Date(2022, 2, 19); // 2022-03-19, YBM넷 입사(전 회사 퇴사일 기준, 공백 거의 없음)

    function formatTenure(start, end) {
        var years = end.getFullYear() - start.getFullYear();
        var months = end.getMonth() - start.getMonth();
        if (end.getDate() < start.getDate()) months -= 1;
        if (months < 0) {
            years -= 1;
            months += 12;
        }
        return "약 " + years + "년 " + months + "개월";
    }

    function renderTenure() {
        var now = new Date();
        var totalEl = document.getElementById("stat-total");
        var currentEl = document.getElementById("stat-current");
        if (totalEl) totalEl.textContent = formatTenure(CAREER_START, now);
        if (currentEl) currentEl.textContent = formatTenure(CURRENT_START, now);
    }

    /* ---------- build date footer ---------- */
    function renderBuildDate() {
        var el = document.getElementById("build-date");
        if (!el) return;
        var today = new Date();
        var pad = function (n) {
            return String(n).padStart(2, "0");
        };
        el.textContent =
            today.getFullYear() +
            "-" +
            pad(today.getMonth() + 1) +
            "-" +
            pad(today.getDate());
    }

    /* ---------- copy email to clipboard ---------- */
    function initCopyButton() {
        var btn = document.getElementById("copy-btn");
        var email = document.getElementById("email");
        var feedback = document.getElementById("copy-feedback");
        if (!btn || !email) return;

        btn.addEventListener("click", function () {
            var text = email.textContent.trim();

            function showCopied() {
                btn.textContent = "copied";
                if (feedback) feedback.textContent = "이메일이 복사되었습니다.";
                window.setTimeout(function () {
                    btn.textContent = "copy";
                    if (feedback) feedback.textContent = "";
                }, 1800);
            }

            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard
                    .writeText(text)
                    .then(showCopied, function () {
                        if (feedback)
                            feedback.textContent =
                                "복사에 실패했습니다. 직접 선택해 복사해주세요.";
                    });
            } else {
                var range = document.createRange();
                range.selectNode(email);
                var selection = window.getSelection();
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
        var toggles = document.querySelectorAll(".repo-toggle");
        toggles.forEach(function (btn) {
            btn.addEventListener("click", function () {
                var panelId = btn.getAttribute("aria-controls");
                var panel = document.getElementById(panelId);
                if (!panel) return;
                var expanded = btn.getAttribute("aria-expanded") === "true";
                btn.setAttribute("aria-expanded", String(!expanded));
                panel.hidden = expanded;
            });
        });
    }

    /* ---------- scroll reveal ---------- */
    function initScrollReveal() {
        var targets = document.querySelectorAll(".log-entry, .repo-card");

        if (prefersReducedMotion || !("IntersectionObserver" in window)) {
            targets.forEach(function (el) {
                el.classList.add("in-view");
            });
            return;
        }

        var observer = new IntersectionObserver(
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

        targets.forEach(function (el) {
            observer.observe(el);
        });
    }

    /* ---------- accessible anchor focus on nav click ---------- */
    function initAnchorFocus() {
        var links = document.querySelectorAll(
            '.toplinks a[href^="#"], .brand[href^="#"]',
        );
        links.forEach(function (link) {
            link.addEventListener("click", function () {
                var id = link.getAttribute("href").slice(1);
                var target = document.getElementById(id);
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

    document.addEventListener("DOMContentLoaded", function () {
        renderTenure();
        renderBuildDate();
        initCopyButton();
        initRepoToggles();
        initScrollReveal();
        initAnchorFocus();
    });
})();
