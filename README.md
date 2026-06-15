<div dir="rtl">

# أذكاري — Azkari PWA

تطبيق ويب تقدّمي (PWA) إسلامي حديث يعمل **بالكامل دون اتصال بالإنترنت** بعد التحميل الأول.
يضم أذكار الصباح والمساء، القرآن الكريم، والسبحة الإلكترونية — بواجهة عربية أنيقة بدعم كامل لاتجاه RTL، ووضع ليلي، وتثبيت على الجهاز.

</div>

---

## ✨ Features

| Section | Details |
|---|---|
| 🏠 **الصفحة الرئيسية** | Hero + **live clock** (Hijri + Gregorian, offline) + **prayer times** + quick-access cards + "continue reading" + verse |
| 🕌 **مواقيت الصلاة** | Today's 5 prayers + sunrise, next-prayer countdown, GPS or IP location, cached for offline (needs internet on first load each day) |
| 🌅 **أذكار الصباح** | 20 adhkar, per-dhikr counter, remaining count, progress ring, "complete all", daily persistence |
| 🌙 **أذكار المساء** | Same engine as morning, independent daily progress |
| 📖 **القرآن الكريم** | All 114 surahs (metadata) · browse · search by name/number · reader mode · adjustable font · bookmarks · last-read position · prev/next |
| 📿 **السبحة الإلكترونية** | Animated tap counter, 5 preset adhkar, reset, daily + lifetime + rounds stats, vibration feedback |
| ⚙️ **الإعدادات** | Light/Dark mode, font-size controls, reset data, **export/import** JSON backup |
| 📴 **Offline** | Service Worker precaches the shell + data + fonts; works with zero network |

**Design:** Cairo / Tajawal / Amiri fonts · glassmorphism · soft teal + gold palette · rounded corners · smooth transitions · responsive (mobile → tablet → desktop with a side rail) · `prefers-reduced-motion` respected · `prefers-color-scheme` honored on first run.

---

## 📁 Project structure

```
Azkar/
├── index.html               # App shell (RTL, SEO + PWA meta, splash links)
├── manifest.json            # PWA manifest (icons, shortcuts, theme)
├── service-worker.js        # Offline-first caching (shell + runtime + fonts)
├── browserconfig.xml        # Windows tile config
├── package.json             # Capacitor deps + build scripts
├── capacitor.config.json    # Native app config (appId, webDir)
├── BUILD-MOBILE.md          # Android/iOS build guide
├── css/
│   └── styles.css           # Design tokens, themes, components, responsive
├── js/
│   ├── storage.js           # localStorage state (single source of truth)
│   ├── ui.js                # DOM helpers, toast, vibration, progress ring
│   ├── prayer-times.js      # Location + prayer times (Aladhan) + countdown
│   ├── app.js               # Theme, hash router, SW registration, install
│   ├── pwa-install.js       # Cross-device install (Chromium + iOS guidance)
│   └── pages/
│       ├── home.js
│       ├── adhkar.js        # morning + evening (shared engine)
│       ├── quran.js         # surah list + reader
│       ├── tasbeeh.js
│       └── settings.js
├── data/
│   ├── morning-adhkar.js    # window.MorningAdhkar
│   ├── evening-adhkar.js    # window.EveningAdhkar
│   ├── quran-meta.js        # window.QuranMeta  (all 114 surahs: names, counts)
│   └── quran-data.js        # window.QuranText  (verse text — generated)
├── quran/                   # Per-surah JSON (001.json … 114.json) + index.json
├── scripts/
│   ├── fetch-quran.js       # Download full Quran → quran/ + data/quran-data.js
│   ├── gen-pwa-assets.js    # Generate favicons, apple-touch-icon, splash screens
│   └── build-www.js         # Bundle web assets → www/ for Capacitor
├── www/                     # Generated bundle for native builds (gitignored)
├── icons/
│   ├── icon.svg
│   ├── icon-192.png · icon-512.png · icon-maskable-512.png
│   ├── apple-touch-icon.png · favicon-16/32/48.png
│   └── splash/              # 13 iOS launch screens (splash-WxH.png)
└── README.md
```

**Architecture:** vanilla JS, zero build step, no backend. Each page is a self-contained module registering itself on `window.Pages`; the router in `app.js` renders the matched page into `#view`. All state flows through `Store` (`storage.js`). The web app has **no runtime dependencies**; Capacitor (in `package.json`) is only used to package the native apps. The only outbound network calls are **optional**: Google Fonts (cached for offline) and the prayer-times APIs (Aladhan + an IP-geolocation fallback) when online — everything else, including the full Quran, runs offline.

---

## 🚀 Run locally

The app must be served over HTTP (service workers don't run from `file://`):

```bash
# any static server works — pick one
python3 -m http.server 8080
# or
npx serve .
```

Then open <http://localhost:8080>. Open DevTools → Application to confirm the Service Worker is active and the manifest is valid. Toggle offline in the Network tab and reload — the app keeps working.

---

## 📖 The full Quran (download script)

Run the bundled, dependency-free Node script (Node 18+) to fetch the complete
Uthmani Quran and write it as clean files:

```bash
node scripts/fetch-quran.js
```

It produces:

- **`quran/001.json … 114.json`** — one simple, self-describing file per surah:
  ```json
  { "number": 2, "name": "...", "type": "مدنية", "ayahCount": 286,
    "bismillah": true, "ayahs": [ { "n": 1, "text": "الٓمٓ" } ] }
  ```
- **`quran/index.json`** — lightweight list of all 114 surahs.
- **`data/quran-data.js`** — regenerated `window.QuranText` so the in-app reader
  immediately shows every surah (6236 ayahs).

The script handles the Basmalah correctly (separate line for surahs 2–114,
kept inside Al-Fatihah, omitted for At-Tawbah) and verifies the 6236-ayah total.
Source: `api.alquran.cloud` (edition *quran-uthmani*), with a CDN fallback.
After running it, **bump `CACHE_VERSION` in `service-worker.js`** so clients
refresh the cache. Always verify against a trusted Mushaf before publishing.

### Manual alternative

To hand-populate instead, edit `data/quran-data.js`. The reader reads from `window.QuranText`, keyed by surah number:

```js
window.QuranText = {
  1: {
    bismillah: false,                 // false only for surah 9 (At-Tawbah)
    ayahs: [
      { n: 1, text: "..." },          // n = ayah number, text = verse text
      { n: 2, text: "..." }
    ]
  },
  // ... 2 .. 114
};
```

**Recommended free, redistributable sources** (Arabic Uthmani text):

- **Tanzil.net** — download the plain-text/XML Quran, well-known and verified.
- **QUL (qul.tarteel.ai)** / **Quran.com API** — export to JSON.
- **fawazahmed0/quran-api** (GitHub, public domain) — per-surah JSON.

A tiny conversion script (Node) to turn a flat `[{surah, ayah, text}]` dump into the shape above:

```js
const fs = require("fs");
const flat = require("./quran-flat.json"); // [{ surah, ayah, text }, ...]
const out = {};
for (const v of flat) {
  (out[v.surah] = out[v.surah] || { bismillah: v.surah !== 9, ayahs: [] })
    .ayahs.push({ n: v.ayah, text: v.text });
}
fs.writeFileSync("data/quran-data.js",
  "window.QuranText = " + JSON.stringify(out) + ";\n");
```

After adding it, **bump `CACHE_VERSION` in `service-worker.js`** so clients pick up the new data.

> Please verify any Quran text against a trusted Mushaf before publishing.

---

## 📱 Native apps (Android `.apk` / `.aab` & iOS `.ipa`)

The app ships with a configured **[Capacitor](https://capacitorjs.com)** wrapper
that compiles the same code into real Android Studio and Xcode projects:

```bash
npm install
npm run add:android && npm run open:android   # build APK/AAB in Android Studio
npm run add:ios     && npm run open:ios        # build IPA in Xcode (Mac only)
```

Full step-by-step instructions (signing, icons, splash, CLI builds, and a
**no-toolchain PWABuilder cloud option**) are in **[BUILD-MOBILE.md](BUILD-MOBILE.md)**.

> Building a *signed* binary requires the platform SDKs (Android SDK/Gradle, or
> macOS + Xcode + your Apple certificate) — these can't be produced without them,
> but every config and script is ready so the build is copy-paste.

---

## 📲 Install on any device (PWA)

أذكاري installs as a standalone app across platforms:

| Platform | How |
|---|---|
| **Android / Chrome, Edge** | A native install prompt appears (and a "تثبيت أذكاري" button in Settings). |
| **Desktop Chrome / Edge** | Install icon in the address bar, or Settings → تثبيت. |
| **iOS / iPadOS Safari** | The app shows step-by-step **Share → Add to Home Screen** instructions (iOS has no install API). |
| **Windows** | Installable via Edge; live-tile color via `browserconfig.xml`. |

What makes it work on every device:

- **Manifest** with maskable + standard icons, app shortcuts, theme color.
- **Full favicon set** (`16/32` + SVG) and a **full-bleed `apple-touch-icon` (180×180)**.
- **13 iOS launch screens** (iPhone SE → 15 Pro Max, iPad → iPad Pro 12.9") wired with per-device media queries, so the standalone app shows a branded splash instead of a white flash.
- **Windows tile** meta + `browserconfig.xml`.
- A **universal install module** ([js/pwa-install.js](js/pwa-install.js)) that uses the native `beforeinstallprompt` on Chromium and falls back to clear instructions on iOS.

### Regenerating the icons & splash screens

The image assets are produced from the brand artwork by a dependency-free,
macOS-only script (uses Quick Look + `sips`):

```bash
node scripts/gen-pwa-assets.js
```

It writes `icons/apple-touch-icon.png`, `icons/favicon-*.png`, and
`icons/splash/splash-WxH.png`. On non-macOS, generate the same files with any
SVG→PNG tool using the sizes printed by the script. After regenerating, bump
`CACHE_VERSION` in `service-worker.js`.

> **Installability requires HTTPS** (or `localhost`). All the hosts below serve HTTPS.

---

## ☁️ Deploy to any static host

No build, no server — upload the folder as-is. The app uses **relative paths**, so it works from a domain root or a sub-path.

**GitHub Pages**
```bash
git init && git add . && git commit -m "أذكاري PWA"
git branch -M main && git remote add origin <your-repo-url> && git push -u origin main
# Repo → Settings → Pages → Deploy from branch → main / root
```

**Netlify** — drag-and-drop the folder onto <https://app.netlify.com/drop>, or `netlify deploy --prod --dir=.`

**Vercel** — `vercel --prod` (Framework preset: *Other*).

**Cloudflare Pages / Firebase Hosting / Surge** — point them at this folder; no config needed.

> Serve over **HTTPS** (all the above do) so the Service Worker and "Add to Home Screen" work.

---

## 💾 Data & privacy

Everything is stored **locally** in `localStorage` under the key `azkari:v1` — adhkar progress, bookmarks, last-read position, tasbeeh stats, and preferences. Nothing leaves the device. Use **Settings → Export** for a JSON backup and **Import** to restore (e.g. on another device).

---

## 🛠️ Customize

- **Colors / theme:** edit the design tokens at the top of `css/styles.css` (`:root` and `[data-theme="dark"]`).
- **Adhkar content:** edit `data/morning-adhkar.js` / `data/evening-adhkar.js` (each item: `title, text, source, count`).
- **Tasbeeh presets:** edit the `PRESETS` array in `js/pages/tasbeeh.js`.
- **Cache assets:** update `SHELL_ASSETS` in `service-worker.js` if you add files.

---

## 📜 License

Code is free to use and modify. Quranic text and adhkar are from the public Islamic tradition — verify against a trusted source before distribution.

<div dir="rtl">

تقبّل الله منا ومنكم صالح الأعمال 🤲

</div>
