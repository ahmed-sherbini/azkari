/**
 * storage.js — single source of truth for all persisted state.
 *
 * Uses localStorage (synchronous, simple, ample for this app's footprint).
 * Everything lives under one namespaced key so export/import and reset are
 * trivial. All reads are defensive so a corrupted value never breaks the app.
 */
(function () {
  "use strict";

  var KEY = "azkari:v1";

  var defaults = {
    prefs: {
      theme: "light",          // "light" | "dark"
      readerFontSize: 28,      // px, Quran reader
      adhkarFontSize: 20       // px, adhkar cards
    },
    adhkar: {
      morning: {},             // { [dhikrId]: remainingCount }
      evening: {},
      morningDate: "",         // ISO date the morning set was last reset
      eveningDate: ""
    },
    quran: {
      bookmarks: [],           // [surahNumber, ...]
      lastRead: null           // { surah, scroll }
    },
    tasbeeh: {
      total: 0,                // lifetime total
      today: 0,                // resets each day
      todayDate: "",
      sessions: 0,             // completed rounds (×33/×100)
      lastPreset: 0            // index into preset list
    }
  };

  function clone(obj) { return JSON.parse(JSON.stringify(obj)); }

  function deepMerge(base, extra) {
    var out = clone(base);
    if (!extra || typeof extra !== "object") return out;
    Object.keys(extra).forEach(function (k) {
      if (extra[k] && typeof extra[k] === "object" && !Array.isArray(extra[k]) && typeof out[k] === "object") {
        out[k] = deepMerge(out[k], extra[k]);
      } else if (extra[k] !== undefined) {
        out[k] = extra[k];
      }
    });
    return out;
  }

  var state;
  try {
    var raw = localStorage.getItem(KEY);
    state = raw ? deepMerge(defaults, JSON.parse(raw)) : clone(defaults);
  } catch (e) {
    state = clone(defaults);
  }

  var saveTimer = null;
  function persist() {
    // Debounced write — taps can fire rapidly.
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      try { localStorage.setItem(KEY, JSON.stringify(state)); }
      catch (e) { /* quota / private mode — fail silently */ }
    }, 120);
  }

  function todayISO() { return new Date().toISOString().slice(0, 10); }

  var Store = {
    get: function () { return state; },

    prefs: function () { return state.prefs; },
    setPref: function (key, val) { state.prefs[key] = val; persist(); },

    // ---- Adhkar ----
    /**
     * Returns the working list for a category, resetting daily so each new day
     * starts fresh while preserving today's progress across reloads.
     */
    adhkarState: function (category) {
      var key = category === "evening" ? "evening" : "morning";
      var dateKey = key + "Date";
      if (state.adhkar[dateKey] !== todayISO()) {
        state.adhkar[key] = {};
        state.adhkar[dateKey] = todayISO();
        persist();
      }
      return state.adhkar[key];
    },
    setAdhkarRemaining: function (category, id, remaining) {
      var key = category === "evening" ? "evening" : "morning";
      state.adhkar[key][id] = remaining;
      persist();
    },
    resetAdhkar: function (category) {
      var key = category === "evening" ? "evening" : "morning";
      state.adhkar[key] = {};
      state.adhkar[key + "Date"] = todayISO();
      persist();
    },

    // ---- Quran ----
    bookmarks: function () { return state.quran.bookmarks; },
    isBookmarked: function (n) { return state.quran.bookmarks.indexOf(n) !== -1; },
    toggleBookmark: function (n) {
      var i = state.quran.bookmarks.indexOf(n);
      if (i === -1) state.quran.bookmarks.push(n);
      else state.quran.bookmarks.splice(i, 1);
      persist();
      return i === -1; // true if now bookmarked
    },
    setLastRead: function (surah, scroll) {
      state.quran.lastRead = { surah: surah, scroll: scroll || 0 };
      persist();
    },
    lastRead: function () { return state.quran.lastRead; },

    // ---- Tasbeeh ----
    tasbeeh: function () {
      if (state.tasbeeh.todayDate !== todayISO()) {
        state.tasbeeh.today = 0;
        state.tasbeeh.todayDate = todayISO();
        persist();
      }
      return state.tasbeeh;
    },
    tasbeehInc: function () {
      this.tasbeeh(); // ensure day-roll
      state.tasbeeh.total++;
      state.tasbeeh.today++;
      persist();
      return state.tasbeeh;
    },
    tasbeehRound: function () { state.tasbeeh.sessions++; persist(); },
    tasbeehSetPreset: function (i) { state.tasbeeh.lastPreset = i; persist(); },
    tasbeehResetStats: function () {
      state.tasbeeh.today = 0; state.tasbeeh.total = 0; state.tasbeeh.sessions = 0;
      state.tasbeeh.todayDate = todayISO();
      persist();
    },

    // ---- Data management ----
    exportData: function () { return JSON.stringify(state, null, 2); },
    importData: function (json) {
      var parsed = JSON.parse(json); // throws on invalid → caller handles
      state = deepMerge(defaults, parsed);
      try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
      return true;
    },
    resetAll: function () {
      state = clone(defaults);
      state.prefs.theme = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      try { localStorage.removeItem(KEY); } catch (e) {}
      persist();
    }
  };

  // First-run theme: respect the OS preference.
  if (!localStorage.getItem(KEY)) {
    state.prefs.theme = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  window.Store = Store;
})();
