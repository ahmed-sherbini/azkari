/**
 * ui.js — tiny DOM/UX helpers shared across pages.
 * Keeps page modules free of boilerplate and keeps rendering safe (no innerHTML
 * with untrusted data; all user/dynamic text goes through createElement/text).
 */
(function () {
  "use strict";

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === "class") node.className = attrs[k];
        else if (k === "text") node.textContent = attrs[k];
        else if (k === "html") node.innerHTML = attrs[k]; // only used with trusted static markup
        else if (k.slice(0, 2) === "on" && typeof attrs[k] === "function") {
          node.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
        } else if (attrs[k] !== false && attrs[k] != null) {
          node.setAttribute(k, attrs[k]);
        }
      });
    }
    (children || []).forEach(function (c) {
      if (c == null) return;
      node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return node;
  }

  var toastTimer;
  function toast(msg) {
    var t = document.getElementById("toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("show"); }, 2200);
  }

  function vibrate(ms) {
    if (navigator.vibrate && Store.prefs().haptics !== false) {
      try { navigator.vibrate(ms); } catch (e) {}
    }
  }

  // Arabic-Indic digits for a more authentic feel where appropriate.
  var ARABIC_DIGITS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
  function toArabicNum(n) {
    return String(n).replace(/[0-9]/g, function (d) { return ARABIC_DIGITS[+d]; });
  }

  /** Build an SVG progress ring. Returns { node, set(pct) }. */
  function progressRing(size, stroke) {
    var r = (size - stroke) / 2;
    var c = 2 * Math.PI * r;
    var ns = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(ns, "svg");
    svg.setAttribute("width", size); svg.setAttribute("height", size);
    function circle(cls) {
      var el = document.createElementNS(ns, "circle");
      el.setAttribute("cx", size / 2); el.setAttribute("cy", size / 2);
      el.setAttribute("r", r); el.setAttribute("fill", "none");
      el.setAttribute("stroke-width", stroke); el.setAttribute("class", cls);
      return el;
    }
    var track = circle("track");
    var bar = circle("bar");
    bar.setAttribute("stroke-dasharray", c);
    bar.setAttribute("stroke-dashoffset", c);
    svg.appendChild(track); svg.appendChild(bar);
    var label = el("div", { class: "pct" });
    var wrap = el("div", { class: "progress-ring" }, [svg, label]);
    return {
      node: wrap,
      set: function (pct) {
        bar.setAttribute("stroke-dashoffset", c * (1 - pct / 100));
        label.textContent = Math.round(pct) + "%";
      }
    };
  }

  window.UI = { el: el, toast: toast, vibrate: vibrate, toArabicNum: toArabicNum, progressRing: progressRing };
})();
