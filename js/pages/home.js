/** home.js — landing page: hero, live clock, prayer times, quick cards, verse. */
(function () {
  "use strict";
  var el = UI.el;

  function greeting() {
    var h = new Date().getHours();
    if (h < 12) return "صباح الخير";
    if (h < 18) return "مساء الخير";
    return "ليلة طيبة";
  }

  /* ---- locale date/time formatters (all offline via Intl) ---- */
  function fmtTime(d) {
    try {
      return new Intl.DateTimeFormat("ar-EG", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true }).format(d);
    } catch (e) { return d.toLocaleTimeString(); }
  }
  function fmtGregorian(d) {
    try {
      return new Intl.DateTimeFormat("ar-EG", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(d);
    } catch (e) { return d.toDateString(); }
  }
  function fmtHijri(d) {
    try {
      // ar-SA islamic calendar already includes the "هـ" era suffix.
      return new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura", { day: "numeric", month: "long", year: "numeric" }).format(d);
    } catch (e) { return ""; }
  }

  var CARDS = [
    { route: "#/morning", cls: "qc-morning", title: "أذكار الصباح", sub: "ابدأ يومك بذكر الله",
      icon: '<svg viewBox="0 0 24 24" width="28" height="28"><path fill="currentColor" d="M12 7a5 5 0 100 10 5 5 0 000-10zm0-6v3m0 16v3M4 12H1m22 0h-3M5 5l2 2m10 10l2 2M19 5l-2 2M7 17l-2 2"/></svg>' },
    { route: "#/evening", cls: "qc-evening", title: "أذكار المساء", sub: "اختم يومك بالذكر",
      icon: '<svg viewBox="0 0 24 24" width="28" height="28"><path fill="currentColor" d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z"/></svg>' },
    { route: "#/quran", cls: "qc-quran", title: "القرآن الكريم", sub: "اقرأ وتدبر",
      icon: '<svg viewBox="0 0 24 24" width="28" height="28"><path fill="currentColor" d="M3 5a2 2 0 012-2h5v16H5a2 2 0 00-2 2zm11-2h5a2 2 0 012 2v16a2 2 0 00-2-2h-5z"/></svg>' },
    { route: "#/tasbeeh", cls: "qc-tasbeeh", title: "السبحة", sub: "سبّح واذكر الله",
      icon: '<svg viewBox="0 0 24 24" width="28" height="28"><circle cx="12" cy="5" r="2.3" fill="currentColor"/><circle cx="5.5" cy="11" r="2.3" fill="currentColor"/><circle cx="18.5" cy="11" r="2.3" fill="currentColor"/><circle cx="8" cy="18" r="2.3" fill="currentColor"/><circle cx="16" cy="18" r="2.3" fill="currentColor"/></svg>' }
  ];

  function render() {
    var view = document.getElementById("view");
    view.innerHTML = "";

    var hero = el("section", { class: "hero" }, [
      el("div", { class: "hero-pattern" }),
      el("span", { class: "hero-greeting", html: '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 5h-2v6l5 3 1-1.7-4-2.3z"/></svg>' }),
      el("h2", { text: "أذكاري" }),
      el("p", { text: "رفيقك اليومي للأذكار والقرآن والتسبيح — يعمل بدون إنترنت." })
    ]);
    hero.querySelector(".hero-greeting").appendChild(document.createTextNode(" " + greeting()));

    /* ---- Live clock card ---- */
    var clockTime = el("div", { class: "clock-time" });
    var clockGreg = el("div", { class: "clock-greg" });
    var clockHijri = el("div", { class: "clock-hijri" });
    var clockCard = el("section", { class: "clock-card glass" }, [
      el("div", { class: "clock-main" }, [clockTime]),
      el("div", { class: "clock-dates" }, [clockHijri, clockGreg])
    ]);
    function tick() {
      var now = new Date();
      clockTime.textContent = UI.toArabicNum(fmtTime(now));
      clockGreg.textContent = fmtGregorian(now);
      clockHijri.textContent = UI.toArabicNum(fmtHijri(now));
      updatePrayerCountdown(now);
    }

    /* ---- Prayer times card ---- */
    var prayerBody = el("div", { class: "prayer-body" }, [
      el("div", { class: "prayer-loading" }, [
        el("span", { class: "spinner" }),
        el("span", { text: "جارٍ تحديد مواقيت الصلاة…" })
      ])
    ]);
    var prayerCard = el("section", { class: "prayer-card glass" }, [
      el("div", { class: "prayer-head" }, [
        el("span", { class: "section-mini", html: '<svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M12 2a7 7 0 00-7 7c0 3 2 5 7 13 5-8 7-10 7-13a7 7 0 00-7-7zm0 4a3 3 0 110 6 3 3 0 010-6z"/></svg>' }),
        el("strong", { text: "مواقيت الصلاة" })
      ]),
      prayerBody
    ]);
    prayerCard.querySelector(".section-mini").appendChild(document.createTextNode(" "));

    var prayerTimings = null;       // { Fajr: "HH:MM", ... }
    var nextLabelNode = null, nextCountNode = null;

    function updatePrayerCountdown(now) {
      if (!prayerTimings || !nextCountNode) return;
      var np = Prayer.nextPrayer(prayerTimings);
      nextLabelNode.textContent = np.label + (np.tomorrow ? " (غداً)" : "");
      nextCountNode.textContent = "بعد " + Prayer.fmtRemaining(np.remaining);
      // Highlight the active upcoming row.
      var rows = prayerBody.querySelectorAll(".prayer-row");
      rows.forEach(function (r) { r.classList.toggle("next", r.getAttribute("data-key") === np.key); });
    }

    function renderPrayer(err, data) {
      prayerBody.innerHTML = "";
      if (err || !data) {
        prayerBody.appendChild(el("div", { class: "prayer-msg" }, [
          el("p", { text: "تعذّر تحديد المواقيت. تأكد من الاتصال بالإنترنت أو فعّل تحديد الموقع." }),
          el("button", { class: "prayer-retry", text: "إعادة المحاولة", onclick: function () {
            prayerBody.innerHTML = "";
            prayerBody.appendChild(el("div", { class: "prayer-loading" }, [ el("span", { class: "spinner" }), el("span", { text: "جارٍ المحاولة…" }) ]));
            Prayer.getTimings(renderPrayer);
          } })
        ]));
        return;
      }
      prayerTimings = data.timings;

      var next = el("div", { class: "prayer-next" }, [
        el("div", {}, [ el("span", { class: "lbl", text: "الصلاة القادمة" }), (nextLabelNode = el("strong")) ]),
        (nextCountNode = el("span", { class: "count" }))
      ]);

      var grid = el("div", { class: "prayer-grid" }, Prayer.ORDER.map(function (o) {
        return el("div", { class: "prayer-row" + (o.prayer ? "" : " minor"), "data-key": o.key }, [
          el("span", { class: "p-name", text: o.label }),
          el("span", { class: "p-time", text: UI.toArabicNum(data.timings[o.key] || "—") })
        ]);
      }));

      var foot = el("div", { class: "prayer-foot" }, [
        document.createTextNode((data.city ? data.city + " · " : "") + (data.source === "gps" ? "موقعك الحالي" : data.source === "ip" ? "حسب الـ IP" : "محفوظ") + (data.stale ? " (قديم)" : ""))
      ]);

      prayerBody.appendChild(next);
      prayerBody.appendChild(grid);
      prayerBody.appendChild(foot);
      updatePrayerCountdown(new Date());
    }

    /* ---- Continue reading ---- */
    var last = Store.lastRead();
    var extras = [];
    if (last && window.QuranMeta) {
      var meta = QuranMeta[last.surah - 1];
      if (meta) {
        extras.push(el("a", { href: "#/quran/" + last.surah, class: "install-banner", style: "border-style:solid;border-color:var(--line)" }, [
          el("div", { class: "txt" }, [ el("strong", { text: "متابعة القراءة" }), document.createTextNode(meta.nameFull) ]),
          el("button", { text: "افتح" })
        ]));
      }
    }

    var grid = el("div", { class: "cards-grid" }, CARDS.map(function (c) {
      return el("a", { href: c.route, class: "quick-card " + c.cls }, [
        el("div", { class: "qc-icon", html: c.icon }),
        el("div", {}, [ el("h3", { text: c.title }), el("p", { text: c.sub }) ])
      ]);
    }));

    var verse = el("section", { class: "info-strip glass" }, [
      el("div", { class: "label", text: "آية وتدبر" }),
      el("div", { class: "verse", text: "﴿ أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ ﴾" }),
      el("div", { class: "dhikr-source", text: "الرعد: 28", style: "margin-top:8px" })
    ]);

    view.appendChild(hero);
    view.appendChild(clockCard);
    view.appendChild(prayerCard);
    extras.forEach(function (e) { view.appendChild(e); });
    view.appendChild(el("h2", { class: "section-title", text: "الوصول السريع" }));
    view.appendChild(grid);
    view.appendChild(verse);

    // Start clock + load prayer times; clean up the interval on navigation.
    tick();
    var timer = setInterval(tick, 1000);
    window.Pages._cleanup = function () { clearInterval(timer); };
    if (window.Prayer) Prayer.getTimings(renderPrayer);
  }

  window.Pages = window.Pages || {};
  window.Pages.home = { render: render, title: "أذكاري" };
})();
