/**
 * pwa-install.js — universal "install app" experience across devices.
 *
 *  - Chromium (Android, desktop Chrome/Edge): uses the captured
 *    `beforeinstallprompt` event to trigger the native install dialog.
 *  - iOS / iPadOS Safari: no such event exists, so we show clear
 *    "Share → Add to Home Screen" instructions instead.
 *  - Already installed (standalone) or recently dismissed: shows nothing.
 *
 * Exposes window.PWAInstall.open() so a Settings button can invite installs too.
 */
(function () {
  "use strict";
  var el = UI.el;
  var DISMISS_KEY = "azkari:install-dismissed";
  var DISMISS_DAYS = 14;

  function isStandalone() {
    return window.matchMedia("(display-mode: standalone)").matches ||
           window.navigator.standalone === true;
  }
  function isiOS() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent) ||
           (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1); // iPadOS
  }
  function recentlyDismissed() {
    var t = parseInt(localStorage.getItem(DISMISS_KEY) || "0", 10);
    return t && (Date.now() - t) < DISMISS_DAYS * 864e5;
  }
  function dismiss() {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch (e) {}
  }

  var sheet = null;

  function close() {
    if (!sheet) return;
    sheet.classList.remove("show");
    var s = sheet;
    setTimeout(function () { if (s && s.parentNode) s.parentNode.removeChild(s); }, 300);
    sheet = null;
  }

  function build(mode) {
    var iconImg = el("img", { src: "icons/icon-192.png", alt: "أذكاري", class: "ins-icon" });
    var hasPrompt = !!(window.App && window.App.canInstall());

    var body;
    if (mode === "ios") {
      body = el("div", { class: "ins-steps" }, [
        el("p", { text: "لتثبيت أذكاري على جهازك:" }),
        el("ol", {}, [
          el("li", { html: 'اضغط زر المشاركة <span class="ins-share">􀈂</span> في شريط Safari' }),
          el("li", { text: "اختر «إضافة إلى الشاشة الرئيسية»" }),
          el("li", { text: "اضغط «إضافة» — وسيظهر التطبيق على جهازك" })
        ])
      ]);
    } else if (hasPrompt) {
      body = el("div", { class: "ins-steps" }, [
        el("p", { text: "ثبّت أذكاري كتطبيق مستقل مع أيقونة على شاشتك." })
      ]);
    } else {
      body = el("div", { class: "ins-steps" }, [
        el("p", { text: "لتثبيت أذكاري: افتح قائمة المتصفح ﴾⋮﴿ ثم اختر «تثبيت التطبيق» أو «Install app»." })
      ]);
    }

    var actions = [];
    if (mode !== "ios" && hasPrompt) {
      actions.push(el("button", { class: "ins-btn primary", text: "تثبيت الآن", onclick: function () {
        window.App.promptInstall();
        close();
      } }));
    }
    actions.push(el("button", { class: "ins-btn", text: "ليس الآن", onclick: function () { dismiss(); close(); } }));

    sheet = el("div", { class: "install-sheet", role: "dialog", "aria-label": "تثبيت التطبيق" }, [
      el("div", { class: "ins-backdrop", onclick: function () { dismiss(); close(); } }),
      el("div", { class: "ins-card glass" }, [
        el("div", { class: "ins-head" }, [ iconImg, el("div", {}, [
          el("strong", { text: "تثبيت أذكاري" }),
          el("span", { text: "أضِفه إلى شاشتك الرئيسية" })
        ]) ]),
        body,
        el("div", { class: "ins-actions" }, actions)
      ])
    ]);
    document.body.appendChild(sheet);
    requestAnimationFrame(function () { sheet.classList.add("show"); });
  }

  /** Force-open (e.g. from Settings). Picks the right mode for the device. */
  function open() {
    if (sheet) return;
    if (isStandalone()) { UI.toast("التطبيق مُثبَّت بالفعل"); return; }
    if (window.App && window.App.canInstall()) build("native");
    else if (isiOS()) build("ios");
    else build("native"); // desktop browser without a pending prompt → generic guidance
  }

  // Auto-suggest once: after the app settles, if installable and not dismissed.
  function maybeAutoPrompt() {
    if (isStandalone() || recentlyDismissed() || sheet) return;
    if (window.App && window.App.canInstall()) { build("native"); return; }
    if (isiOS()) { build("ios"); return; }
  }

  // Chromium fires the event slightly after load; re-check then.
  window.addEventListener("appinstalled", function () { dismiss(); close(); });
  window.addEventListener("azkari:installable", maybeAutoPrompt);
  setTimeout(maybeAutoPrompt, 3500);

  window.PWAInstall = { open: open, close: close, isStandalone: isStandalone };
})();
