/**
 * adhkar.js — renders morning & evening adhkar with per-dhikr counters,
 * a sticky progress ring, "complete all", and daily persistence.
 */
(function () {
  "use strict";
  var el = UI.el;

  function getList(category) {
    return category === "evening" ? window.EveningAdhkar : window.MorningAdhkar;
  }

  function render(category) {
    var view = document.getElementById("view");
    view.innerHTML = "";

    var list = getList(category) || [];
    var saved = Store.adhkarState(category); // { id: remaining }

    // Build a working model: remaining defaults to full count on a fresh day.
    var items = list.map(function (d) {
      var remaining = saved[d.id];
      if (remaining === undefined) remaining = d.count;
      return { def: d, remaining: remaining };
    });

    var ring = UI.progressRing(56, 6);

    function totals() {
      var totalReps = 0, doneReps = 0;
      items.forEach(function (it) {
        totalReps += it.def.count;
        doneReps += (it.def.count - it.remaining);
      });
      return { pct: totalReps ? (doneReps / totalReps) * 100 : 0, doneReps: doneReps, totalReps: totalReps };
    }

    var head = el("div", { class: "progress-head glass" }, [
      ring.node,
      el("div", { class: "meta" }, [
        el("strong", { text: category === "evening" ? "أذكار المساء" : "أذكار الصباح" }),
        el("span", { class: "count-label" })
      ]),
      el("button", { class: "btn-complete-all", text: "إتمام الكل", onclick: completeAll })
    ]);

    var banner = el("div"); // placeholder for completion banner
    var cardsWrap = el("div");

    function updateHead() {
      var t = totals();
      ring.set(t.pct);
      head.querySelector(".count-label").textContent =
        UI.toArabicNum(t.doneReps) + " / " + UI.toArabicNum(t.totalReps) + " تكرار";
      banner.innerHTML = "";
      if (t.pct >= 100) {
        banner.appendChild(el("div", { class: "complete-banner" }, [
          el("div", { class: "big", text: "تقبّل الله طاعتك 🤲" }),
          el("div", { text: "أتممت أذكار " + (category === "evening" ? "المساء" : "الصباح") + " لهذا اليوم" })
        ]));
      }
    }

    function makeCard(it) {
      var d = it.def;
      var bar = el("i");
      var numSpan = el("span", { class: "counter-num" });
      var btn = el("button", { class: "counter-btn" }, [
        el("span", { class: "btn-label", text: "سبّح" }), numSpan
      ]);
      var card = el("div", { class: "dhikr-card" }, [
        el("div", { class: "dhikr-head" }, [
          el("span", { class: "dhikr-title", text: d.title }),
          el("span", { class: "dhikr-badge", text: "×" + UI.toArabicNum(d.count) })
        ]),
        el("div", { class: "dhikr-text", text: d.text }),
        el("div", { class: "dhikr-source", text: "المصدر: " + d.source }),
        el("div", { class: "dhikr-footer" }, [btn]),
        el("div", { class: "dhikr-bar" }, [bar])
      ]);

      function paint() {
        numSpan.textContent = UI.toArabicNum(it.remaining);
        var pct = ((d.count - it.remaining) / d.count) * 100;
        bar.style.width = pct + "%";
        var done = it.remaining <= 0;
        card.classList.toggle("done", done);
        btn.classList.toggle("done", done);
        btn.querySelector(".btn-label").textContent = done ? "تم ✓" : "سبّح";
      }

      btn.addEventListener("click", function () {
        if (it.remaining <= 0) {
          // tap again to repeat the dhikr from the start
          it.remaining = d.count;
        } else {
          it.remaining--;
          UI.vibrate(15);
        }
        Store.setAdhkarRemaining(category, d.id, it.remaining);
        paint();
        updateHead();
      });

      paint();
      return card;
    }

    items.forEach(function (it) { cardsWrap.appendChild(makeCard(it)); });

    function completeAll() {
      items.forEach(function (it) {
        it.remaining = 0;
        Store.setAdhkarRemaining(category, it.def.id, 0);
      });
      // repaint every card
      cardsWrap.innerHTML = "";
      items.forEach(function (it) { cardsWrap.appendChild(makeCard(it)); });
      updateHead();
      UI.vibrate([20, 40, 20]);
      UI.toast("تم إتمام جميع الأذكار");
    }

    view.appendChild(head);
    view.appendChild(banner);
    view.appendChild(cardsWrap);
    updateHead();
  }

  window.Pages = window.Pages || {};
  window.Pages.morning = { render: function () { render("morning"); }, title: "أذكار الصباح", back: true };
  window.Pages.evening = { render: function () { render("evening"); }, title: "أذكار المساء", back: true };
})();
