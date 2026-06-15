/**
 * quran.js — surah index (browse + search + bookmarks) and the reader
 * (font controls, bookmark toggle, last-read persistence, dark-mode friendly).
 */
(function () {
  "use strict";
  var el = UI.el;

  /* ---------------- Surah index ---------------- */
  function renderList() {
    var view = document.getElementById("view");
    view.innerHTML = "";
    var meta = window.QuranMeta || [];

    var input = el("input", {
      type: "search", placeholder: "ابحث عن سورة بالاسم أو الرقم…",
      "aria-label": "بحث في السور", inputmode: "search"
    });
    var search = el("div", { class: "search-bar" }, [
      el("span", { html: '<svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M10 2a8 8 0 105.3 14l5.4 5.3 1.4-1.4-5.3-5.4A8 8 0 0010 2zm0 2a6 6 0 110 12 6 6 0 010-12z"/></svg>' }),
      input
    ]);

    var listWrap = el("div", { class: "surah-list" });

    function rows(filterText) {
      listWrap.innerHTML = "";
      var q = (filterText || "").trim();
      var bms = Store.bookmarks();

      var matches = meta.filter(function (s) {
        if (!q) return true;
        return s.name.indexOf(q) !== -1 || s.nameFull.indexOf(q) !== -1 ||
               String(s.number) === q || UI.toArabicNum(s.number) === q;
      });

      // Show bookmarks first when not searching.
      if (!q && bms.length) {
        matches.sort(function (a, b) {
          var ab = bms.indexOf(a.number) !== -1, bb = bms.indexOf(b.number) !== -1;
          return (bb ? 1 : 0) - (ab ? 1 : 0);
        });
      }

      if (!matches.length) {
        listWrap.appendChild(el("div", { class: "empty", html:
          '<svg viewBox="0 0 24 24" width="48" height="48"><path fill="currentColor" d="M10 2a8 8 0 105.3 14l5.4 5.3 1.4-1.4-5.3-5.4A8 8 0 0010 2z"/></svg>' }, [
          el("p", { text: "لا توجد نتائج مطابقة" })
        ]));
        return;
      }

      matches.forEach(function (s) {
        var star = el("button", {
          class: "bookmark-star" + (Store.isBookmarked(s.number) ? " on" : ""),
          "aria-label": "حفظ السورة",
          html: '<svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M6 2h12a1 1 0 011 1v19l-7-4-7 4V3a1 1 0 011-1z"/></svg>'
        });
        star.addEventListener("click", function (e) {
          e.preventDefault(); e.stopPropagation();
          var on = Store.toggleBookmark(s.number);
          star.classList.toggle("on", on);
          UI.vibrate(12);
          UI.toast(on ? "تمت إضافة العلامة" : "تم حذف العلامة");
        });

        var row = el("a", { href: "#/quran/" + s.number, class: "surah-row" }, [
          el("div", { class: "surah-num" }, [ el("span", { text: UI.toArabicNum(s.number) }) ]),
          el("div", { class: "surah-info" }, [
            el("div", { class: "name", text: s.name }),
            el("div", { class: "sub", text: s.type + " · " + UI.toArabicNum(s.ayahCount) + " آيات" })
          ]),
          star
        ]);
        listWrap.appendChild(row);
      });
    }

    input.addEventListener("input", function () { rows(input.value); });

    view.appendChild(search);
    view.appendChild(listWrap);
    rows("");
  }

  /* ---------------- Reader ---------------- */
  function renderReader(num) {
    var view = document.getElementById("view");
    view.innerHTML = "";
    num = parseInt(num, 10);
    var meta = (window.QuranMeta || [])[num - 1];
    if (!meta) { renderList(); return; }

    var text = (window.QuranText || {})[num];

    // Toolbar: font size + bookmark
    var sizeLabel = el("span", { class: "font-size-label" });
    function applySize() {
      var px = Store.prefs().readerFontSize;
      document.documentElement.style.setProperty("--reader-font-size", px + "px");
      sizeLabel.textContent = px + "px";
    }
    function bump(delta) {
      var px = Math.min(48, Math.max(18, Store.prefs().readerFontSize + delta));
      Store.setPref("readerFontSize", px);
      applySize();
    }

    var bmBtn = el("button", {
      class: Store.isBookmarked(num) ? "on" : "",
      html: '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M6 2h12a1 1 0 011 1v19l-7-4-7 4V3a1 1 0 011-1z"/></svg>'
    });
    bmBtn.appendChild(document.createTextNode(" حفظ"));
    bmBtn.addEventListener("click", function () {
      var on = Store.toggleBookmark(num);
      bmBtn.classList.toggle("on", on);
      UI.vibrate(12);
      UI.toast(on ? "تمت إضافة العلامة" : "تم حذف العلامة");
    });

    var toolbar = el("div", { class: "reader-toolbar glass" }, [
      el("button", { text: "أ−", "aria-label": "تصغير الخط", onclick: function () { bump(-2); } }),
      sizeLabel,
      el("button", { text: "أ+", "aria-label": "تكبير الخط", onclick: function () { bump(2); } }),
      el("span", { class: "grow" }),
      bmBtn
    ]);

    var header = el("div", { class: "surah-header" }, [
      el("div", { class: "title", text: meta.nameFull }),
      el("div", { class: "meta", text: meta.type + " · " + UI.toArabicNum(meta.ayahCount) + " آيات · ترتيب " + UI.toArabicNum(meta.number) })
    ]);

    var body = el("div", { class: "reader-body" });

    if (text && text.ayahs && text.ayahs.length) {
      if (text.bismillah) {
        body.appendChild(el("div", { class: "basmalah", text: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ" }));
      }
      var frag = document.createDocumentFragment();
      text.ayahs.forEach(function (a) {
        var span = el("span", { class: "ayah" }, [
          document.createTextNode(a.text + " "),
          // U+06DD (end-of-ayah) followed by the number → Amiri renders the
          // number enclosed in the rosette ornament.
          el("span", { class: "ayah-mark", text: "۝" + UI.toArabicNum(a.n) })
        ]);
        frag.appendChild(span);
        frag.appendChild(document.createTextNode(" "));
      });
      body.appendChild(frag);
    } else {
      // Graceful note when full text hasn't been populated yet.
      body.appendChild(el("div", { class: "reader-missing" }, [
        el("div", { html: '<svg viewBox="0 0 24 24" width="44" height="44"><path fill="currentColor" d="M3 5a2 2 0 012-2h5v16H5a2 2 0 00-2 2zm11-2h5a2 2 0 012 2v16a2 2 0 00-2-2h-5z"/></svg>' }),
        el("p", { text: "نص هذه السورة غير مُضمَّن في النسخة التجريبية." }),
        el("p", { text: "أضِف مجموعة بيانات القرآن الكاملة لعرض جميع السور.", style: "font-size:.82rem;margin-top:6px" }),
        el("code", { text: "data/quran-data.js → window.QuranText[" + num + "]" })
      ]));
    }

    // Prev / next navigation
    var navRow = el("div", { class: "reader-toolbar glass", style: "margin-top:16px" }, [
      el("button", { text: "› السابقة", disabled: num <= 1, onclick: function () { if (num > 1) location.hash = "#/quran/" + (num - 1); } }),
      el("span", { class: "grow" }),
      el("button", { text: "التالية ‹", disabled: num >= 114, onclick: function () { if (num < 114) location.hash = "#/quran/" + (num + 1); } })
    ]);

    applySize();
    view.appendChild(toolbar);
    view.appendChild(header);
    view.appendChild(body);
    view.appendChild(navRow);

    // Persist last-read + restore scroll.
    Store.setLastRead(num, 0);
    var last = Store.lastRead();
    if (last && last.surah === num && last.scroll) {
      requestAnimationFrame(function () { window.scrollTo(0, last.scroll); });
    }
    var scrollHandler = function () { Store.setLastRead(num, window.scrollY); };
    window.addEventListener("scroll", scrollHandler, { passive: true });
    // Clean up when navigating away.
    window.Pages._cleanup = function () { window.removeEventListener("scroll", scrollHandler); };
  }

  window.Pages = window.Pages || {};
  window.Pages.quran = { render: renderList, title: "القرآن الكريم", back: true };
  window.Pages.quranReader = { render: renderReader, title: "القرآن الكريم", back: true };
})();
