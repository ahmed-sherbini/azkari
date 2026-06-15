/**
 * app.js — bootstrap, theming, hash router, service-worker registration,
 * and the PWA install prompt. Loaded last so all pages/data are ready.
 */
(function () {
  "use strict";

  var topbar = {
    back: document.getElementById("backBtn"),
    title: document.getElementById("topbarTitle"),
    themeToggle: document.getElementById("themeToggle")
  };

  /* ---------------- Theme ---------------- */
  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "dark" ? "#0b1513" : "#0f766e");
  }
  applyTheme(Store.prefs().theme);

  // Apply saved font sizes globally on boot.
  document.documentElement.style.setProperty("--reader-font-size", Store.prefs().readerFontSize + "px");
  document.documentElement.style.setProperty("--adhkar-font-size", Store.prefs().adhkarFontSize + "px");

  topbar.themeToggle.addEventListener("click", function () {
    var next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    Store.setPref("theme", next);
    applyTheme(next);
    UI.vibrate(10);
  });

  /* ---------------- Settings entry (gear in topbar) ---------------- */
  var gear = document.createElement("a");
  gear.href = "#/settings";
  gear.className = "icon-btn";
  gear.setAttribute("aria-label", "الإعدادات");
  gear.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M12 8a4 4 0 100 8 4 4 0 000-8zm9 4a7 7 0 00-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 00-2-1.2l-.4-2.6H9.9l-.4 2.6a7 7 0 00-2 1.2l-2.4-1-2 3.4 2 1.6A7 7 0 003 12c0 .4 0 .8.1 1.2l-2 1.6 2 3.4 2.4-1c.6.5 1.3.9 2 1.2l.4 2.6h4.2l.4-2.6c.7-.3 1.4-.7 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z"/></svg>';
  topbar.themeToggle.parentNode.insertBefore(gear, topbar.themeToggle);

  /* ---------------- Router ---------------- */
  var routes = {
    "/": "home",
    "/morning": "morning",
    "/evening": "evening",
    "/quran": "quran",
    "/tasbeeh": "tasbeeh",
    "/settings": "settings"
  };

  function setActiveNav(path) {
    var items = document.querySelectorAll(".nav-item");
    items.forEach(function (a) {
      var r = a.getAttribute("data-route");
      var on = r === path || (r === "/quran" && path.indexOf("/quran") === 0);
      a.classList.toggle("active", on);
    });
  }

  function route() {
    // Clean up listeners registered by the previous page (e.g. reader scroll).
    if (window.Pages._cleanup) { try { window.Pages._cleanup(); } catch (e) {} window.Pages._cleanup = null; }

    var hash = location.hash.replace(/^#/, "") || "/";
    var parts = hash.split("/").filter(Boolean); // e.g. ["quran","112"]
    var page, isReader = false, readerArg = null;

    if (parts[0] === "quran" && parts[1]) {
      page = window.Pages.quranReader; isReader = true; readerArg = parts[1];
    } else {
      var name = routes["/" + (parts[0] || "")] || "home";
      page = window.Pages[name];
    }
    if (!page) page = window.Pages.home;

    // Topbar state
    topbar.title.textContent = page.title || "أذكاري";
    var showBack = !!page.back || isReader;
    topbar.back.hidden = !showBack;

    setActiveNav(isReader ? "/quran" : "/" + (parts[0] || ""));

    window.scrollTo(0, 0);
    if (isReader) page.render(readerArg);
    else page.render();
  }

  topbar.back.addEventListener("click", function () {
    // Reader → list, otherwise → home.
    if (location.hash.indexOf("#/quran/") === 0) location.hash = "#/quran";
    else if (history.length > 1) history.back();
    else location.hash = "#/";
  });

  window.addEventListener("hashchange", route);

  /* ---------------- PWA install prompt ---------------- */
  var deferredPrompt = null;
  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    deferredPrompt = e;
    window.dispatchEvent(new Event("azkari:installable"));
  });
  window.addEventListener("appinstalled", function () { deferredPrompt = null; });
  window.App = {
    applyTheme: applyTheme,
    canInstall: function () { return !!deferredPrompt; },
    promptInstall: function () {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      deferredPrompt.userChoice.finally(function () { deferredPrompt = null; });
    }
  };

  /* ---------------- Service worker ---------------- */
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("service-worker.js").catch(function () {
        /* registration failure is non-fatal; app still works online */
      });
    });
  }

  /* ---------------- Go ---------------- */
  window.Pages = window.Pages || {};
  route();
})();
