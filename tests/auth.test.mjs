import { test } from "node:test";
import assert from "node:assert/strict";
import {
  COOKIE_NAME, adminConfigured, checkPassword, clearSessionCookie, hashPassword,
  isLoggedIn, makeSessionCookie, noteFailedAttempt, resetAttempts, safeEqual, tooManyAttempts,
} from "../netlify/functions/auth.mjs";

/** Blob-Store-Attrappe. */
function fakeStore(initial = null) {
  let stored = initial;
  return {
    get: async () => stored,
    setJSON: async (_key, value) => { stored = value; },
    peek: () => stored,
  };
}

const cookieOf = (header) => {
  const value = header.split(";")[0].slice(COOKIE_NAME.length + 1);
  return { headers: new Headers({ cookie: `${COOKIE_NAME}=${value}` }) };
};

test("safeEqual vergleicht inhaltlich", () => {
  assert.equal(safeEqual("abc", "abc"), true);
  assert.equal(safeEqual("abc", "abd"), false);
  assert.equal(safeEqual("abc", "abcd"), false);
  assert.equal(safeEqual("", ""), true);
});

test("Passwort aus der Umgebungsvariable", async () => {
  const store = fakeStore();
  process.env.ADMIN_PASSWORD = "Sehr-geheim-123";
  assert.equal(await adminConfigured(store), true);
  assert.equal(await checkPassword(store, "Sehr-geheim-123"), true);
  assert.equal(await checkPassword(store, "falsch"), false);
  assert.equal(await checkPassword(store, ""), false);
  assert.equal(await checkPassword(store, undefined), false);
});

test("ohne eingerichtetes Passwort bleibt der Admin zu", async () => {
  const store = fakeStore();
  delete process.env.ADMIN_PASSWORD;
  assert.equal(await adminConfigured(store), false);
  assert.equal(await checkPassword(store, "irgendwas"), false);
  process.env.ADMIN_PASSWORD = "Sehr-geheim-123";
});

test("gespeicherter Hash schlägt die Umgebungsvariable", async () => {
  const store = fakeStore(await hashPassword("Neues-Passwort-42"));
  assert.equal(await checkPassword(store, "Neues-Passwort-42"), true);
  assert.equal(await checkPassword(store, "Sehr-geheim-123"), false);
});

test("Sitzungscookie: gültig, gefälscht, abgelaufen", async () => {
  const store = fakeStore();
  const header = await makeSessionCookie(store);
  assert.match(header, /HttpOnly/);
  assert.match(header, /Secure/);
  assert.match(header, /SameSite=Lax/);
  assert.equal(await isLoggedIn(store, cookieOf(header)), true);

  assert.equal(await isLoggedIn(store, { headers: new Headers({ cookie: `${COOKIE_NAME}=9999999999.abc` }) }), false);
  assert.equal(await isLoggedIn(store, { headers: new Headers({}) }), false);

  const old = await makeSessionCookie(store, Date.now() - 13 * 3600 * 1000);
  assert.equal(await isLoggedIn(store, cookieOf(old)), false, "abgelaufene Sitzung zählt nicht");
});

test("Passwortwechsel entwertet alte Sitzungen", async () => {
  const store = fakeStore();
  const header = await makeSessionCookie(store);
  assert.equal(await isLoggedIn(store, cookieOf(header)), true);
  await store.setJSON("auth/password", await hashPassword("Ganz-neues-Passwort"));
  assert.equal(await isLoggedIn(store, cookieOf(header)), false);
});

test("Abmelden löscht das Cookie", () => {
  assert.match(clearSessionCookie(), /Max-Age=0/);
});

test("Bremse nach zu vielen Fehlversuchen", () => {
  const ip = "203.0.113.7";
  resetAttempts(ip);
  for (let i = 0; i < 9; i++) noteFailedAttempt(ip);
  assert.equal(tooManyAttempts(ip), false);
  noteFailedAttempt(ip);
  assert.equal(tooManyAttempts(ip), true);
  resetAttempts(ip);
  assert.equal(tooManyAttempts(ip), false);
});
