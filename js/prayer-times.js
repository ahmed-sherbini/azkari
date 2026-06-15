/**
 * prayer-times.js — current location prayer times + helpers.
 *
 * Design:
 *   - Location: GPS via navigator.geolocation (works offline once permitted);
 *     falls back to IP geolocation (needs internet) if GPS is denied.
 *   - Times: fetched from the free Aladhan API (https://aladhan.com) — no key.
 *   - Resilience: the day's timings are cached in localStorage, so once fetched
 *     they keep showing even with no connection until the date changes.
 *
 * Clock & Hijri/Gregorian dates are computed locally with Intl (fully offline);
 * only the prayer timings need the network on first load of a given day.
 */
(function () {
  "use strict";

  var CACHE_KEY = "azkari:prayer";
  var METHOD = 5; // Aladhan: 5 = Egyptian General Authority of Survey

  // Display order + Arabic labels (Sunrise shown for reference, not a prayer).
  var ORDER = [
    { key: "Fajr",    label: "الفجر",   prayer: true },
    { key: "Sunrise", label: "الشروق",  prayer: false },
    { key: "Dhuhr",   label: "الظهر",   prayer: true },
    { key: "Asr",     label: "العصر",   prayer: true },
    { key: "Maghrib", label: "المغرب",  prayer: true },
    { key: "Isha",    label: "العشاء",  prayer: true }
  ];

  function todayISO() { return new Date().toISOString().slice(0, 10); }

  function readCache() {
    try {
      var c = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
      return c && c.date === todayISO() ? c : null;
    } catch (e) { return null; }
  }
  function writeCache(obj) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(obj)); } catch (e) {}
  }

  function fetchJSON(url, timeoutMs) {
    var ctrl = ("AbortController" in window) ? new AbortController() : null;
    var t = ctrl ? setTimeout(function () { ctrl.abort(); }, timeoutMs || 8000) : null;
    return fetch(url, ctrl ? { signal: ctrl.signal } : undefined)
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .finally(function () { if (t) clearTimeout(t); });
  }

  function getCoords() {
    return new Promise(function (resolve, reject) {
      if (!navigator.geolocation) { reject(new Error("no-geo")); return; }
      navigator.geolocation.getCurrentPosition(
        function (p) { resolve({ lat: p.coords.latitude, lon: p.coords.longitude, source: "gps" }); },
        function () { reject(new Error("denied")); },
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 6 * 3600 * 1000 }
      );
    });
  }

  // IP-based location (needs internet) when GPS is unavailable/denied.
  function getCoordsByIP() {
    return fetchJSON("https://ipapi.co/json/", 8000).then(function (j) {
      if (j && j.latitude && j.longitude) {
        return { lat: j.latitude, lon: j.longitude, city: j.city, country: j.country_name, source: "ip" };
      }
      throw new Error("ip-failed");
    });
  }

  function fetchTimings(loc) {
    var ts = Math.floor(Date.now() / 1000);
    var url = "https://api.aladhan.com/v1/timings/" + ts +
      "?latitude=" + loc.lat + "&longitude=" + loc.lon + "&method=" + METHOD;
    return fetchJSON(url, 9000).then(function (j) {
      if (!j || !j.data || !j.data.timings) throw new Error("bad-timings");
      var t = j.data.timings;
      var timings = {};
      ORDER.forEach(function (o) { timings[o.key] = (t[o.key] || "").slice(0, 5); });
      return {
        date: todayISO(),
        timings: timings,
        city: loc.city || (j.data.meta && j.data.meta.timezone) || "",
        source: loc.source,
        method: METHOD
      };
    });
  }

  /**
   * Resolve prayer timings for today. Order: fresh cache → GPS → IP → stale cache.
   * cb(err, data) where data = { date, timings, city, source }.
   */
  function getTimings(cb) {
    var cached = readCache();
    if (cached) { cb(null, cached); return; }

    getCoords()
      .catch(function () { return getCoordsByIP(); })
      .then(fetchTimings)
      .then(function (data) { writeCache(data); cb(null, data); })
      .catch(function (err) {
        // Last resort: any cached value, even if not today's.
        try {
          var any = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
          if (any) { cb(null, Object.assign({ stale: true }, any)); return; }
        } catch (e) {}
        cb(err || new Error("unavailable"));
      });
  }

  /** Given { "HH:MM" } timings, find the next upcoming prayer. */
  function nextPrayer(timings) {
    var now = new Date();
    var prayers = ORDER.filter(function (o) { return o.prayer; });
    for (var i = 0; i < prayers.length; i++) {
      var hm = timings[prayers[i].key];
      if (!hm) continue;
      var parts = hm.split(":");
      var d = new Date(now);
      d.setHours(+parts[0], +parts[1], 0, 0);
      if (d > now) {
        return { label: prayers[i].label, key: prayers[i].key, at: d, remaining: d - now };
      }
    }
    // All passed → tomorrow's Fajr.
    var f = timings.Fajr ? timings.Fajr.split(":") : ["5", "0"];
    var fajr = new Date(now);
    fajr.setDate(fajr.getDate() + 1);
    fajr.setHours(+f[0], +f[1], 0, 0);
    return { label: "الفجر", key: "Fajr", at: fajr, remaining: fajr - now, tomorrow: true };
  }

  function fmtRemaining(ms) {
    var totalMin = Math.max(0, Math.round(ms / 60000));
    var h = Math.floor(totalMin / 60), m = totalMin % 60;
    if (h > 0) return h + " س " + m + " د";
    return m + " د";
  }

  window.Prayer = {
    ORDER: ORDER,
    getTimings: getTimings,
    nextPrayer: nextPrayer,
    fmtRemaining: fmtRemaining
  };
})();
