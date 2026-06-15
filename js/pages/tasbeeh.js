/**
 * tasbeeh.js — animated digital counter with preset dhikr, reset,
 * daily/lifetime stats, and vibration feedback.
 */
(function () {
  "use strict";
  var el = UI.el;

  var PRESETS = [
    { label: "سبحان الله", target: 33 },
    { label: "الحمد لله", target: 33 },
    { label: "الله أكبر", target: 33 },
    { label: "لا إله إلا الله", target: 100 },
    { label: "أستغفر الله", target: 100 }
  ];

  var count = 0; // current round count (session, not persisted alone)

  function render() {
    var view = document.getElementById("view");
    view.innerHTML = "";
    var st = Store.tasbeeh();
    var activePreset = PRESETS[st.lastPreset] ? st.lastPreset : 0;

    // Preset chips
    var chipsWrap = el("div", { class: "tasbeeh-presets" });
    var currentLabel = el("div", { class: "tasbeeh-current" });
    var roundLabel = el("div", { class: "tasbeeh-round" });
    var countNode = el("div", { class: "tap-count" });
    var pulse = el("div", { class: "tap-pulse" });

    function preset() { return PRESETS[activePreset]; }

    function paint() {
      currentLabel.textContent = preset().label;
      countNode.textContent = UI.toArabicNum(count);
      var target = preset().target;
      roundLabel.textContent = "الهدف: " + UI.toArabicNum(count % target) + " / " + UI.toArabicNum(target)
        + " · الجولات: " + UI.toArabicNum(Math.floor(count / target));
    }

    function buildChips() {
      chipsWrap.innerHTML = "";
      PRESETS.forEach(function (p, i) {
        var chip = el("button", { class: "preset-chip" + (i === activePreset ? " on" : ""), text: p.label });
        chip.addEventListener("click", function () {
          activePreset = i;
          count = 0;
          Store.tasbeehSetPreset(i);
          buildChips();
          paint();
          UI.vibrate(10);
        });
        chipsWrap.appendChild(chip);
      });
    }

    var statToday = el("div", { class: "num" });
    var statTotal = el("div", { class: "num" });
    var statSessions = el("div", { class: "num" });
    function paintStats() {
      var s = Store.tasbeeh();
      statToday.textContent = UI.toArabicNum(s.today);
      statTotal.textContent = UI.toArabicNum(s.total);
      statSessions.textContent = UI.toArabicNum(s.sessions);
    }

    var tapZone = el("div", { class: "tap-zone", role: "button", tabindex: "0", "aria-label": "اضغط للتسبيح" }, [
      pulse,
      el("div", {}, [ countNode, el("div", { class: "tap-hint", text: "اضغط في أي مكان" }) ])
    ]);

    function tap() {
      count++;
      var target = preset().target;
      Store.tasbeehInc();
      if (count % target === 0) {
        Store.tasbeehRound();
        UI.vibrate([30, 50, 30]);
        UI.toast("أتممت " + UI.toArabicNum(target) + " — " + preset().label);
      } else {
        UI.vibrate(15);
      }
      pulse.classList.remove("go");
      void pulse.offsetWidth; // restart animation
      pulse.classList.add("go");
      paint();
      paintStats();
    }

    tapZone.addEventListener("click", tap);
    tapZone.addEventListener("keydown", function (e) {
      if (e.code === "Space" || e.code === "Enter") { e.preventDefault(); tap(); }
    });

    var actions = el("div", { class: "tasbeeh-actions" }, [
      el("button", { class: "t-btn", html: '<svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M12 5V2L8 6l4 4V7a5 5 0 11-5 5H5a7 7 0 107-7z"/></svg>',
        onclick: function () { count = 0; paint(); UI.vibrate(20); UI.toast("تم تصفير العدّاد"); } }),
      el("button", { class: "t-btn danger", html: '<svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M6 7h12l-1 14H7zM9 4h6l1 2H8z"/></svg>',
        onclick: function () {
          if (confirm("تصفير إحصائيات اليوم والإجمالي؟")) {
            Store.tasbeehResetStats();
            count = 0; paint(); paintStats(); UI.toast("تم تصفير الإحصائيات");
          }
        } })
    ]);
    actions.children[0].appendChild(document.createTextNode(" تصفير"));
    actions.children[1].appendChild(document.createTextNode(" حذف الإحصائيات"));

    var stats = el("div", { class: "stats-grid" }, [
      el("div", { class: "stat-box" }, [ statToday, el("div", { class: "lbl", text: "اليوم" }) ]),
      el("div", { class: "stat-box" }, [ statTotal, el("div", { class: "lbl", text: "الإجمالي" }) ]),
      el("div", { class: "stat-box" }, [ statSessions, el("div", { class: "lbl", text: "الجولات" }) ])
    ]);

    var wrap = el("div", { class: "tasbeeh-wrap" }, [
      chipsWrap, currentLabel, roundLabel, tapZone, actions, stats
    ]);

    view.appendChild(wrap);
    buildChips();
    paint();
    paintStats();
  }

  window.Pages = window.Pages || {};
  window.Pages.tasbeeh = { render: render, title: "السبحة الإلكترونية", back: true };
})();
