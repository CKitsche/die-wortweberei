import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { FIELD_TYPES, IMAGE_SLOTS, sanitizeContent } from "../netlify/functions/fields.mjs";

const html = ["public/index.html", "public/success.html"].map((f) => readFileSync(f, "utf8")).join("\n");
const found = (attr) => new Set([...html.matchAll(new RegExp(`\\s${attr}="([^"]+)"`, "g"))].map((m) => m[1]));

test("jedes bearbeitbare Feld steht im HTML und umgekehrt", () => {
  const inHtml = new Set([...found("data-cms"), ...found("data-cms-list"), ...found("data-cms-block")]);
  const inSchema = new Set(FIELD_TYPES.keys());
  assert.deepEqual([...inSchema].filter((k) => !inHtml.has(k)), [], "im Schema, fehlt im HTML");
  assert.deepEqual([...inHtml].filter((k) => !inSchema.has(k)), [], "im HTML, fehlt im Schema");
});

test("Listen sind im HTML Listen, Blöcke sind Blöcke", () => {
  for (const [key, type] of FIELD_TYPES) {
    if (type === "list") assert.ok(found("data-cms-list").has(key), key);
    else if (type === "block") assert.ok(found("data-cms-block").has(key), key);
    else assert.ok(found("data-cms").has(key), key);
  }
});

test("jeder Fotoplatz ist im HTML markiert und die Datei gibt es", () => {
  assert.deepEqual([...found("data-cms-img")].sort(), IMAGE_SLOTS.map((s) => s.key).sort());
  for (const slot of IMAGE_SLOTS) {
    assert.ok(existsSync("public/" + slot.default), slot.default);
    assert.ok(html.includes(`<img src="${slot.default}"`), slot.key);
  }
});

test("Formular bleibt für Netlify Forms erkennbar", () => {
  assert.match(html, /<form[^>]*name="anfrage"[^>]*data-netlify="true"/);
  assert.match(html, /name="form-name" value="anfrage"/);
});

test("sanitizeContent: Müll fliegt raus, leer heißt Original", () => {
  assert.deepEqual(sanitizeContent(null), { texts: {}, images: {} });
  assert.deepEqual(sanitizeContent("quatsch"), { texts: {}, images: {} });
  const c = sanitizeContent({
    texts: {
      "hero.tagline": "  Neu\r\nZweite Zeile ",
      "hero.scroll": "Eine\nZeile",
      "about.title": "   ",
      "unbekannt": "x",
      "angebot.trauer.list": ["  Punkt ", "", 3],
      "angebot.baby.list": [],
      "angebot.hochzeit.list": "kein Array",
    },
    images: {
      hero: "/api/media/abc.jpg",
      about: "https://fremd.example/x.jpg",
      cafe: "/api/media/../../geheim",
      quatsch: "/api/media/abc.jpg",
    },
  });
  assert.deepEqual(c.texts, {
    "hero.tagline": "Neu\nZweite Zeile",
    "hero.scroll": "Eine Zeile",
    "angebot.trauer.list": ["Punkt"],
  });
  assert.deepEqual(c.images, { hero: "/api/media/abc.jpg" });
});
