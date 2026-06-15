#!/usr/bin/env node
/**
 * build-www.js — assemble the static web assets into ./www for Capacitor.
 *
 * Capacitor bundles `webDir` (www) into the native Android/iOS projects.
 * We copy only the runtime files (no node_modules, scripts, or native dirs),
 * so the packaged app stays lean and works fully offline.
 *
 *   node scripts/build-www.js   (or: npm run build:www)
 */
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "www");

// Files and folders that make up the running app.
const INCLUDE = [
  "index.html",
  "manifest.json",
  "browserconfig.xml",
  "service-worker.js",
  "css",
  "js",
  "data",
  "icons",
  "quran"
];

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

let copied = 0;
for (const entry of INCLUDE) {
  const src = path.join(ROOT, entry);
  if (!fs.existsSync(src)) {
    console.warn("• skipped (missing): " + entry);
    continue;
  }
  fs.cpSync(src, path.join(OUT, entry), { recursive: true });
  copied++;
  console.log("✓ " + entry);
}

console.log("\nBuilt www/ with " + copied + " entries → ready for `cap sync`.");
