// API für den Redaktionsbereich der Wortweberei.
//
// Speicher (Netlify Blobs):
//   Store "content": site          → Änderungen von Carolina { texts, images }
//                    auth/password → PBKDF2-Hash, falls das Passwort geändert wurde
//   Store "media":   <hash>.<ext>  → hochgeladene Fotos
import { getStore } from "@netlify/blobs";
import { IMAGE_SLOTS, PANELS, TABS, sanitizeContent } from "./fields.mjs";
import {
  adminConfigured, checkPassword, clearSessionCookie, isLoggedIn, makeSessionCookie,
  noteFailedAttempt, resetAttempts, setPassword, tooManyAttempts,
} from "./auth.mjs";

const contentStore = () => getStore({ name: "content", consistency: "strong" });
const mediaStore = () => getStore({ name: "media", consistency: "strong" });

const CONTENT_KEY = "site";
// Netlify begrenzt den Request-Body, rund 4,5 MB kommen sicher durch.
const MAX_UPLOAD_BYTES = 4.4 * 1024 * 1024;
const MIME_EXT = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

function json(status, data, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers },
  });
}

async function loadContent() {
  try {
    return sanitizeContent(await contentStore().get(CONTENT_KEY, { type: "json" }));
  } catch (err) {
    console.error("Inhalte konnten nicht gelesen werden", err);
    return sanitizeContent(null);
  }
}

async function readJson(req) {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

// --------------------------------------------------------------- Inhalte ---

async function handleSaveContent(req) {
  const body = await readJson(req);
  if (!body) return json(400, { ok: false, error: "Ungültige Daten." });
  const content = sanitizeContent(body.content);
  await contentStore().setJSON(CONTENT_KEY, content);
  return json(200, { ok: true, content });
}

// ----------------------------------------------------------------- Fotos ---

async function handleMediaGet(url) {
  const key = decodeURIComponent(url.pathname.slice("/api/media/".length));
  if (!/^[A-Za-z0-9._-]{1,120}$/.test(key)) return json(404, { ok: false, error: "Nicht gefunden." });
  const res = await mediaStore().getWithMetadata(key, { type: "arrayBuffer" });
  if (!res) return json(404, { ok: false, error: "Bild nicht gefunden." });
  return new Response(res.data, {
    status: 200,
    headers: {
      "Content-Type": String(res.metadata?.contentType || "application/octet-stream"),
      // Der Dateiname enthält den Inhalts-Hash, die Datei ändert sich nie.
      "Cache-Control": "public, max-age=31536000, immutable",
      "Netlify-CDN-Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

async function handleMediaUpload(req) {
  const contentType = (req.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
  const ext = MIME_EXT[contentType];
  if (!ext) return json(415, { ok: false, error: "Nur JPEG, PNG oder WebP." });

  const bytes = new Uint8Array(await req.arrayBuffer());
  if (!bytes.length) return json(400, { ok: false, error: "Leere Datei." });
  if (bytes.length > MAX_UPLOAD_BYTES) return json(413, { ok: false, error: "Bild ist zu groß." });

  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hash = [...new Uint8Array(digest)].slice(0, 16).map((b) => b.toString(16).padStart(2, "0")).join("");
  const key = `${hash}.${ext}`;
  await mediaStore().set(key, bytes, { metadata: { contentType, uploaded: new Date().toISOString() } });
  return json(200, { ok: true, url: `/api/media/${key}`, bytes: bytes.length });
}

/** Fotos wegräumen, die in den Inhalten nicht mehr vorkommen. */
async function handleMediaCleanup() {
  const content = await loadContent();
  const used = new Set(Object.values(content.images).map((u) => u.split("/").pop()));
  const s = mediaStore();
  const { blobs } = await s.list();
  let removed = 0;
  for (const b of blobs) {
    if (used.has(b.key)) continue;
    await s.delete(b.key);
    removed++;
  }
  return json(200, { ok: true, removed });
}

// ------------------------------------------------------------- Anmeldung ---

function clientIp(req) {
  return req.headers.get("x-nf-client-connection-ip")
    || (req.headers.get("x-forwarded-for") || "").split(",")[0].trim()
    || "unbekannt";
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function handleLogin(req) {
  const ip = clientIp(req);
  if (tooManyAttempts(ip)) {
    return json(429, { ok: false, error: "Zu viele Versuche. Bitte in ein paar Minuten noch einmal." });
  }
  const body = await readJson(req);
  if (!body) return json(400, { ok: false, error: "Ungültige Daten." });
  const store = contentStore();
  if (!(await adminConfigured(store))) {
    return json(503, { ok: false, error: "Es ist noch kein Passwort eingerichtet (ADMIN_PASSWORD in Netlify setzen)." });
  }
  if (!(await checkPassword(store, body.password))) {
    noteFailedAttempt(ip);
    await sleep(400); // Durchprobieren unattraktiv machen
    return json(401, { ok: false, error: "Passwort stimmt nicht." });
  }
  resetAttempts(ip);
  return json(200, { ok: true }, { "Set-Cookie": await makeSessionCookie(store) });
}

async function handleSession(req) {
  const store = contentStore();
  return json(200, { ok: true, loggedIn: await isLoggedIn(store, req), configured: await adminConfigured(store) });
}

async function handlePassword(req) {
  const body = await readJson(req);
  if (!body) return json(400, { ok: false, error: "Ungültige Daten." });
  const store = contentStore();
  const next = typeof body.password === "string" ? body.password : "";
  if (!(await checkPassword(store, body.current))) {
    return json(401, { ok: false, error: "Das bisherige Passwort stimmt nicht." });
  }
  if (next.length < 10) return json(400, { ok: false, error: "Neues Passwort: mindestens 10 Zeichen." });
  if (next.length > 200) return json(400, { ok: false, error: "Neues Passwort ist zu lang." });
  await setPassword(store, next);
  // Der Wechsel entwertet die alte Sitzung, deshalb gleich eine neue.
  return json(200, { ok: true }, { "Set-Cookie": await makeSessionCookie(store) });
}

// --------------------------------------------------------------- Routing ---

export default async function handler(req) {
  const url = new URL(req.url);
  const path = url.pathname;
  const { method } = req;

  try {
    if (method === "GET" && path === "/api/content") return json(200, { ok: true, content: await loadContent() });
    if (method === "GET" && path.startsWith("/api/media/")) return handleMediaGet(url);

    if (method === "POST" && path === "/api/admin/login") return handleLogin(req);
    if (method === "POST" && path === "/api/admin/logout") return json(200, { ok: true }, { "Set-Cookie": clearSessionCookie() });
    if (method === "GET" && path === "/api/admin/session") return handleSession(req);

    if (path.startsWith("/api/admin/")) {
      if (!(await isLoggedIn(contentStore(), req))) return json(401, { ok: false, error: "Bitte neu anmelden." });
      if (method === "GET" && path === "/api/admin/schema") return json(200, { ok: true, tabs: TABS, panels: PANELS, imageSlots: IMAGE_SLOTS });
      if (method === "PUT" && path === "/api/admin/content") return handleSaveContent(req);
      if (method === "POST" && path === "/api/admin/media") return handleMediaUpload(req);
      if (method === "POST" && path === "/api/admin/cleanup") return handleMediaCleanup();
      if (method === "POST" && path === "/api/admin/password") return handlePassword(req);
    }
    return json(404, { ok: false, error: "Nicht gefunden." });
  } catch (err) {
    console.error("API-Fehler", path, err);
    return json(500, { ok: false, error: "Interner Fehler." });
  }
}

export const config = { path: "/api/*" };
