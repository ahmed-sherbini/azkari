<div dir="rtl">

# بناء تطبيق أذكاري لنظامي Android و iOS

</div>

This guide turns the أذكاري web app into **native installable apps**: an Android
`.apk` / `.aab` and an iOS `.ipa`. It uses **[Capacitor](https://capacitorjs.com)**,
which wraps the existing web app (no rewrite) into real Android Studio and Xcode
projects you can build and publish.

> **Why you build it (not me):** producing a *signed, installable* binary needs
> platform SDKs and your own signing identity — Android SDK + Gradle + JDK for the
> APK, and macOS + Xcode + an Apple Developer certificate for the IPA. The project
> below is fully configured; the commands are copy-paste.

---

## 0) Prerequisites

| Target | You need |
|---|---|
| **Android** | [Node.js 18+](https://nodejs.org), [Android Studio](https://developer.android.com/studio) (includes SDK + Gradle), JDK 17 (bundled with Android Studio) |
| **iOS** | A **Mac**, [Xcode](https://apps.apple.com/app/xcode/id497799835), [CocoaPods](https://cocoapods.org) (`sudo gem install cocoapods`), and an Apple ID (free for device testing; paid Developer Program for the App Store) |

---

## 1) One-time setup

From the project root:

```bash
npm install                 # installs Capacitor (listed in package.json)
npm run build:www           # bundles the app into ./www
npx cap init "أذكاري" com.azkari.app --web-dir=www   # only if capacitor.config.json is missing
```

`capacitor.config.json` is already included (appId `com.azkari.app`), so the
`init` step is usually unnecessary.

---

## 2) Android → APK / AAB

```bash
npm run add:android         # creates the android/ native project
npm run open:android        # opens it in Android Studio
```

In **Android Studio**:

1. Let Gradle sync finish.
2. **Build → Build Bundle(s) / APK(s) → Build APK(s)** → produces a debug
   `app-debug.apk` you can install directly (`adb install`), great for testing.
3. For Play Store / a shareable release:
   **Build → Generate Signed Bundle / APK**, create a keystore, and choose
   **AAB** (for Play) or **APK** (for sideloading).

Command-line alternative (no IDE):

```bash
cd android
./gradlew assembleDebug      # → android/app/build/outputs/apk/debug/app-debug.apk
./gradlew assembleRelease    # signed release (configure signing in android/app/build.gradle)
```

**App icon & splash:** drop `icons/icon-512.png` into Android Studio's
*Image Asset* tool, or use [`@capacitor/assets`](https://github.com/ionic-team/capacitor-assets):
```bash
npx @capacitor/assets generate --android   # uses icons/ to create all densities
```

---

## 3) iOS → IPA (Mac only)

```bash
npm run add:ios             # creates the ios/ native project
npm run open:ios            # opens the workspace in Xcode
```

In **Xcode**:

1. Select the **App** target → **Signing & Capabilities** → pick your Team
   (Apple ID). Xcode auto-manages the signing certificate.
2. To test on a device: plug it in, select it, press **▶ Run**.
3. To export an `.ipa`: **Product → Archive** → **Distribute App** →
   *Ad Hoc* / *App Store Connect* / *Development*.

**Location permission (for prayer times):** add a usage string so GPS works —
in Xcode open `ios/App/App/Info.plist` and add:

```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>لعرض مواقيت الصلاة الدقيقة حسب موقعك.</string>
```

(The app already falls back to IP-based location, so this is optional but
recommended.) Generate icons/splash with `npx @capacitor/assets generate --ios`.

---

## 4) After any web change

Re-bundle and copy into the native projects:

```bash
npm run sync                # = build:www + cap sync   (run before every build)
```

---

## 5) No local toolchain? Use PWABuilder (cloud)

If you don't want to install Android Studio / Xcode, deploy the app to any HTTPS
host (see `README.md`), then:

1. Go to **<https://www.pwabuilder.com>** and enter your deployed URL.
2. It validates the manifest + service worker and **packages**:
   - **Android** — a signed `.apk` / `.aab` (Trusted Web Activity) ready for Play.
   - **iOS** — an Xcode project you open and archive on a Mac.
   - **Windows** — an `.msix` for the Microsoft Store.

This reuses the same manifest, icons, and offline support already in this repo.

---

## Notes specific to this app

- **Offline:** all adhkar, the full Quran, and tasbeeh work with no network in the
  native app (assets are bundled). Only **prayer times** need internet on first
  load of each day (then they're cached); the clock + Hijri/Gregorian dates are
  computed on-device and always work offline.
- **Service worker:** harmless inside Capacitor — if the WebView doesn't run it
  (e.g. iOS `capacitor://` scheme), offline still works because assets are bundled.
- **App ID:** change `com.azkari.app` in `capacitor.config.json` *before* the first
  `cap add` if you want your own bundle identifier.
