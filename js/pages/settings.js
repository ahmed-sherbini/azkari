/**
 * settings.js — theme, font sizes, data reset, export/import.
 */
(function () {
  "use strict";
  var el = UI.el;

  function render() {
    var view = document.getElementById("view");
    view.innerHTML = "";
    var prefs = Store.prefs();

    /* ---- Appearance ---- */
    var themeSwitch = el("input", { type: "checkbox" });
    themeSwitch.checked = prefs.theme === "dark";
    themeSwitch.addEventListener("change", function () {
      var theme = themeSwitch.checked ? "dark" : "light";
      Store.setPref("theme", theme);
      window.App.applyTheme(theme);
    });

    function fontSeg(prefKey, cssVar, min, max, step) {
      var label = el("span", { class: "fs-size", text: prefs[prefKey] + "px" });
      function setPx(px) {
        px = Math.min(max, Math.max(min, px));
        Store.setPref(prefKey, px);
        label.textContent = px + "px";
        if (cssVar) document.documentElement.style.setProperty(cssVar, px + "px");
      }
      return el("div", { class: "font-stepper" }, [
        el("button", { class: "fs-btn", "aria-label": "تصغير الخط", title: "تصغير الخط", html: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" d="M6 12h12"/></svg>', onclick: function () { setPx(Store.prefs()[prefKey] - step); } }),
        label,
        el("button", { class: "fs-btn", "aria-label": "تكبير الخط", title: "تكبير الخط", html: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" d="M12 6v12M6 12h12"/></svg>', onclick: function () { setPx(Store.prefs()[prefKey] + step); } })
      ]);
    }

    var appearance = el("div", { class: "settings-group" }, [
      el("h3", { text: "المظهر" }),
      el("div", { class: "setting-row" }, [
        el("div", { class: "label" }, [ el("strong", { text: "الوضع الليلي" }), el("span", { text: "ألوان داكنة مريحة للعين" }) ]),
        el("label", { class: "switch" }, [ themeSwitch, el("span", { class: "slider" }) ])
      ]),
      el("div", { class: "setting-row" }, [
        el("div", { class: "label" }, [ el("strong", { text: "حجم خط القرآن" }), el("span", { text: "في وضع القراءة" }) ]),
        fontSeg("readerFontSize", "--reader-font-size", 18, 48, 2)
      ]),
      el("div", { class: "setting-row" }, [
        el("div", { class: "label" }, [ el("strong", { text: "حجم خط الأذكار" }), el("span", { text: "في بطاقات الأذكار" }) ]),
        fontSeg("adhkarFontSize", "--adhkar-font-size", 16, 32, 2)
      ])
    ]);

    /* ---- Data management ---- */
    var fileInput = el("input", { type: "file", accept: "application/json", style: "display:none" });
    fileInput.addEventListener("change", function () {
      var f = fileInput.files[0];
      if (!f) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          Store.importData(reader.result);
          UI.toast("تم استيراد البيانات بنجاح");
          setTimeout(function () { location.reload(); }, 700);
        } catch (e) {
          UI.toast("ملف غير صالح");
        }
      };
      reader.readAsText(f);
    });

    function exportData() {
      var blob = new Blob([Store.exportData()], { type: "application/json" });
      var url = URL.createObjectURL(blob);
      var a = el("a", { href: url, download: "azkari-backup-" + new Date().toISOString().slice(0, 10) + ".json" });
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      UI.toast("تم تصدير نسخة احتياطية");
    }

    var dataGroup = el("div", { class: "settings-group" }, [
      el("h3", { text: "البيانات" }),
      el("div", { class: "setting-row", style: "display:block" }, [
        el("div", { class: "settings-actions" }, [
          el("button", { class: "btn-line primary", html: '<svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M5 20h14v-2H5zm7-16L6 10h4v6h4v-6h4z" transform="rotate(180 12 10)"/></svg>',
            onclick: exportData }),
          el("button", { class: "btn-line", html: '<svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M5 20h14v-2H5zm7-16L6 10h4v6h4v-6h4z"/></svg>',
            onclick: function () { fileInput.click(); } }),
          el("button", { class: "btn-line danger", html: '<svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M6 7h12l-1 14H7zM9 4h6l1 2H8z"/></svg>',
            onclick: function () {
              if (confirm("سيتم حذف جميع البيانات المحفوظة (الأذكار، العلامات، السبحة، الإعدادات). متابعة؟")) {
                Store.resetAll();
                UI.toast("تمت إعادة التعيين");
                setTimeout(function () { location.reload(); }, 700);
              }
            } }),
          fileInput
        ])
      ])
    ]);
    // Add labels to data buttons
    var btns = dataGroup.querySelectorAll(".btn-line");
    btns[0].appendChild(document.createTextNode(" تصدير نسخة احتياطية"));
    btns[1].appendChild(document.createTextNode(" استيراد بيانات"));
    btns[2].appendChild(document.createTextNode(" إعادة تعيين جميع البيانات"));

    /* ---- Install (hidden once running as an installed app) ---- */
    var appGroup = null;
    if (!(window.PWAInstall && window.PWAInstall.isStandalone())) {
      appGroup = el("div", { class: "settings-group" }, [
        el("h3", { text: "التطبيق" }),
        el("div", { class: "setting-row", style: "display:block" }, [
          el("button", { class: "btn-line primary",
            html: '<svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M11 3h2v8h3l-4 5-4-5h3zM5 19h14v2H5z"/></svg>',
            onclick: function () { if (window.PWAInstall) window.PWAInstall.open(); } },
            ["  تثبيت أذكاري على الجهاز"])
        ])
      ]);
    }

    var footer = el("div", { class: "app-footer" }, [
      el("div", { text: "أذكاري — تطبيق ويب تقدمي" }),
      el("div", { text: "صُمّم بحب · جميع البيانات محفوظة على جهازك فقط" })
    ]);

    view.appendChild(appearance);
    if (appGroup) view.appendChild(appGroup);
    view.appendChild(dataGroup);
    view.appendChild(footer);
  }

  window.Pages = window.Pages || {};
  window.Pages.settings = { render: render, title: "الإعدادات", back: true };
})();
