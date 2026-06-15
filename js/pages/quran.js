/**
 * quran.js — surah index (browse + search + bookmarks) and the reader
 * (font controls, bookmark toggle, last-read persistence, dark-mode friendly).
 */
(function () {
  "use strict";
  var el = UI.el;

  // Global index of the real Madani mushaf: page (1..604) → ordered ayahs,
  // built once from the page numbers stored per ayah in quran-data.js.
  var mushaf = null;
  function buildMushaf() {
    if (mushaf) return mushaf;
    var T = window.QuranText || {};
    var byPage = {}, surahStart = {};
    for (var num = 1; num <= 114; num++) {
      var s = T[num];
      if (!s || !s.ayahs || !s.ayahs.length) continue;
      surahStart[num] = s.ayahs[0].page || null;
      s.ayahs.forEach(function (a, idx) {
        var p = a.page;
        if (!p) return;
        (byPage[p] = byPage[p] || []).push({
          surah: num, n: a.n, text: a.text, bismillah: s.bismillah, isStart: idx === 0, juz: a.juz
        });
      });
    }
    var nums = Object.keys(byPage).map(Number).sort(function (a, b) { return a - b; });
    mushaf = { byPage: byPage, surahStart: surahStart, min: nums[0] || 1, max: nums[nums.length - 1] || 1 };
    return mushaf;
  }

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
    var sizeLabel = el("span", { class: "fs-size" });
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
      // Bookmark the surah that starts the current page.
      var on = Store.toggleBookmark(pageFirstSurah);
      bmBtn.classList.toggle("on", on);
      UI.vibrate(12);
      UI.toast(on ? "تمت إضافة العلامة" : "تم حذف العلامة");
    });

    var fontStepper = el("div", { class: "font-stepper" }, [
      el("button", { class: "fs-btn", "aria-label": "تصغير الخط", title: "تصغير الخط", html: '<span class="fs-a sm">A</span>', onclick: function () { bump(-2); } }),
      sizeLabel,
      el("button", { class: "fs-btn", "aria-label": "تكبير الخط", title: "تكبير الخط", html: '<span class="fs-a lg">A</span>', onclick: function () { bump(2); } })
    ]);
    var toolbar = el("div", { class: "reader-toolbar glass" }, [
      fontStepper,
      el("span", { class: "grow" }),
      bmBtn
    ]);

    var headerTitle = el("div", { class: "title", text: meta.nameFull });
    var headerMeta = el("div", { class: "meta" });
    var header = el("div", { class: "surah-header" }, [headerTitle, headerMeta]);

    var body = el("div", { class: "reader-body" });

    // ---- Real mushaf pagination ----
    var idx = buildMushaf();
    var hasPages = !!idx.surahStart[num];
    var pageFirstSurah = num; // surah used by the bookmark button (first on page)

    var pageInd = el("span", { class: "page-indicator" });
    // RTL page nav: "previous" points right →, "next" points left ←.
    var chevR = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>';
    var chevL = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" d="M15 5l-7 7 7 7"/></svg>';
    var prevBtn = el("button", { class: "pg-btn", "aria-label": "الصفحة السابقة" });
    prevBtn.innerHTML = "<span>السابقة</span>" + chevR;
    var nextBtn = el("button", { class: "pg-btn", "aria-label": "الصفحة التالية" });
    nextBtn.innerHTML = chevL + "<span>التالية</span>";

    // Starting page: resume if returning to this surah, else the surah's first page.
    var current = idx.surahStart[num] || 1;
    var lr = Store.lastRead();
    if (lr && lr.surah === num && lr.page && idx.byPage[lr.page]) current = lr.page;

    function syncBookmarkBtn() {
      var on = Store.isBookmarked(pageFirstSurah);
      bmBtn.classList.toggle("on", on);
    }

    function renderPage() {
      body.innerHTML = "";
      if (!hasPages) {
        body.appendChild(el("div", { class: "reader-missing" }, [
          el("div", { html: '<svg viewBox="0 0 24 24" width="44" height="44"><path fill="currentColor" d="M3 5a2 2 0 012-2h5v16H5a2 2 0 00-2 2zm11-2h5a2 2 0 012 2v16a2 2 0 00-2-2h-5z"/></svg>' }),
          el("p", { text: "نص هذه السورة غير متوفر." })
        ]));
        pageInd.textContent = "—";
        prevBtn.disabled = nextBtn.disabled = true;
        return;
      }
      var entries = idx.byPage[current] || [];
      pageFirstSurah = entries.length ? entries[0].surah : num;

      var frag = document.createDocumentFragment();
      var lastSurah = null;
      entries.forEach(function (e) {
        if (e.surah !== lastSurah) {
          // A new surah begins on this page → decorative name band (+ basmalah).
          var m = (window.QuranMeta || [])[e.surah - 1];
          frag.appendChild(el("div", { class: "surah-band" }, [
            el("span", { text: m ? m.nameFull : "سورة " + e.surah })
          ]));
          if (e.bismillah && e.isStart) {
            frag.appendChild(el("div", { class: "basmalah", text: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ" }));
          }
          lastSurah = e.surah;
        }
        var span = el("span", { class: "ayah" }, [
          document.createTextNode(e.text + " "),
          // U+06DD (end-of-ayah) + number → Amiri renders it inside the rosette.
          el("span", { class: "ayah-mark", text: "۝" + UI.toArabicNum(e.n) })
        ]);
        frag.appendChild(span);
        frag.appendChild(document.createTextNode(" "));
      });
      body.appendChild(frag);

      // Distinct juz' present on this page (a page may straddle two juz').
      var juzList = [];
      entries.forEach(function (e) { if (e.juz && juzList.indexOf(e.juz) === -1) juzList.push(e.juz); });
      juzList.sort(function (a, b) { return a - b; });
      var juzText = juzList.length
        ? "الجزء " + (juzList.length > 1
            ? UI.toArabicNum(juzList[0]) + "–" + UI.toArabicNum(juzList[juzList.length - 1])
            : UI.toArabicNum(juzList[0]))
        : "";

      // Header reflects the first surah on this page + the real page number + juz'.
      var fm = (window.QuranMeta || [])[pageFirstSurah - 1];
      headerTitle.textContent = fm ? fm.nameFull : meta.nameFull;
      headerMeta.textContent = "صفحة " + UI.toArabicNum(current) + " من ٦٠٤" + (juzText ? " · " + juzText : "");

      pageInd.textContent = "صفحة " + UI.toArabicNum(current) + " / ٦٠٤";
      prevBtn.disabled = current <= idx.min;
      nextBtn.disabled = current >= idx.max;
      syncBookmarkBtn();
      Store.setLastRead(pageFirstSurah, 0, current);
      window.scrollTo(0, 0);
    }

    prevBtn.addEventListener("click", function () { if (current > idx.min) { current--; renderPage(); } });
    nextBtn.addEventListener("click", function () { if (current < idx.max) { current++; renderPage(); } });

    var navRow = el("div", { class: "reader-toolbar glass page-nav", style: "margin-top:16px" }, [
      prevBtn, el("span", { class: "grow" }), pageInd, el("span", { class: "grow" }), nextBtn
    ]);

    applySize();
    view.appendChild(toolbar);
    view.appendChild(header);
    view.appendChild(body);
    view.appendChild(navRow);
    renderPage();
  }

  window.Pages = window.Pages || {};
  window.Pages.quran = { render: renderList, title: "القرآن الكريم", back: true };
  window.Pages.quranReader = { render: renderReader, title: "القرآن الكريم", back: true };
})();
