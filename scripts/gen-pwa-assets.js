#!/usr/bin/env node
/**
 * gen-pwa-assets.js — generate the cross-device PWA image assets:
 *   - apple-touch-icon (full-bleed, 180×180 — iOS adds its own rounding)
 *   - favicon-16/32/48
 *   - iOS launch ("splash") screens for the common iPhone/iPad sizes
 *
 * macOS only: rasterizes SVG via Quick Look (`qlmanage`) and resizes with
 * `sips` — no third-party dependencies. Re-run after changing the brand.
 *
 *   node scripts/gen-pwa-assets.js
 *
 * On non-macOS, generate the same files with any SVG→PNG tool using the
 * printed sizes, or skip — the app still installs (just without custom splash).
 */
"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const ICONS = path.join(ROOT, "icons");
const SPLASH = path.join(ICONS, "splash");
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "azkari-"));

const TEAL = "#0f766e";

if (process.platform !== "darwin") {
  console.error("This generator uses macOS qlmanage/sips. Skipping on " + process.platform + ".");
  process.exit(0);
}

fs.mkdirSync(SPLASH, { recursive: true });

/* ---- brand artwork (crescent + star badge), reusable at any scale ---- */
function logoGroup(cx, cy, size) {
  const s = size / 512; // icon.svg is authored on a 512 grid
  const tx = cx - size / 2, ty = cy - size / 2;
  return `
  <g transform="translate(${tx} ${ty}) scale(${s})">
    <rect width="512" height="512" rx="112" fill="${TEAL}"/>
    <g transform="translate(256 250)">
      <circle r="120" fill="url(#gold)"/>
      <circle r="120" cx="44" cy="-18" fill="${TEAL}"/>
    </g>
    <path transform="translate(330 175)" d="M0 -34l9 24 25 2-19 16 6 24-21-13-21 13 6-24-19-16 25-2z" fill="url(#gold)"/>
  </g>`;
}

function defs() {
  return `
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0b1513"/>
      <stop offset="0.5" stop-color="#0d403a"/>
      <stop offset="1" stop-color="#0f766e"/>
    </linearGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#e6c976"/>
      <stop offset="1" stop-color="#c79a3a"/>
    </linearGradient>
  </defs>`;
}

/* ---- rasterize an SVG string to an exact W×H PNG ---- */
function renderSVG(svg, outPath, w, h) {
  const svgPath = path.join(TMP, "tmp.svg");
  fs.writeFileSync(svgPath, svg);
  // Quick Look fits within a square of `-s` px, preserving the SVG aspect.
  execFileSync("qlmanage", ["-t", "-s", String(Math.max(w, h)), "-o", TMP, svgPath],
    { stdio: "ignore" });
  const ql = path.join(TMP, "tmp.svg.png");
  // Force exact pixel dimensions (aspect already correct → no distortion).
  execFileSync("sips", ["-z", String(h), String(w), ql, "--out", outPath],
    { stdio: "ignore" });
}

/* ---- apple-touch-icon: full-bleed square, no transparency ---- */
function appleTouchIcon() {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 180 180">` +
    defs() +
    `<rect width="180" height="180" fill="${TEAL}"/>` +
    logoGroup(90, 88, 150).replace(`rx="112"`, `rx="0"`) +
    `</svg>`;
  renderSVG(svg, path.join(ICONS, "apple-touch-icon.png"), 180, 180);
  console.log("✓ icons/apple-touch-icon.png (180×180)");
}

/* ---- favicons from the existing icon-512 (keeps rounded look) ---- */
function favicons() {
  [16, 32, 48].forEach((n) => {
    execFileSync("sips", ["-z", String(n), String(n),
      path.join(ICONS, "icon-512.png"), "--out", path.join(ICONS, `favicon-${n}.png`)],
      { stdio: "ignore" });
    console.log(`✓ icons/favicon-${n}.png`);
  });
}

/* ---- iOS launch screens (portrait) for common devices ---- */
const SPLASHES = [
  [1290, 2796], [1179, 2556], [1284, 2778], [1170, 2532],
  [1125, 2436], [1242, 2688], [828, 1792],  [750, 1334],
  [1242, 2208], [1536, 2048], [1668, 2224], [1668, 2388], [2048, 2732]
];

function splashScreens() {
  SPLASHES.forEach(([w, h]) => {
    const badge = Math.round(Math.min(w, h) * 0.34);
    const cy = Math.round(h * 0.42);
    const fontSize = Math.round(badge * 0.22);
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
      defs() +
      `<rect width="${w}" height="${h}" fill="url(#bg)"/>` +
      logoGroup(w / 2, cy, badge) +
      `<text x="${w / 2}" y="${cy + badge / 2 + fontSize * 1.6}" text-anchor="middle" ` +
      `font-family="Cairo, Tajawal, -apple-system, sans-serif" font-weight="700" ` +
      `font-size="${fontSize}" fill="#ffffff">أذكاري</text>` +
      `</svg>`;
    renderSVG(svg, path.join(SPLASH, `splash-${w}x${h}.png`), w, h);
    console.log(`✓ icons/splash/splash-${w}x${h}.png`);
  });
}

try {
  appleTouchIcon();
  favicons();
  splashScreens();
  console.log("\nAll PWA assets generated. The <link> tags are already wired in index.html.");
} finally {
  fs.rmSync(TMP, { recursive: true, force: true });
}
