// Redaktion der Wortweberei: liest markierte Texte aus dem HTML und setzt
// Carolinas Änderungen ein. Wird von der Website und von /admin benutzt.
//
//   data-cms="schlüssel"        Text mit kleiner Formatierung (fett, kursiv, Link)
//   data-cms-attr="placeholder" … steht dann in diesem Attribut statt im Element
//   data-cms-list="schlüssel"   <ul>, Stichpunkte
//   data-cms-block="schlüssel"  längerer Text mit ## Zwischenüberschriften
//   data-cms-img="schlüssel"    austauschbares Foto
//
// Schlägt das Laden fehl, bleibt einfach die Fassung aus dem HTML stehen.
(() => {
  "use strict";

  const escapeHtml = (s) => String(s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  /** Nur harmlose Linkziele: http(s), mailto, eigene Pfade und Anker. */
  const safeHref = (url) => /^(https?:\/\/|mailto:|\/|#)[^\s"]*$/i.test(url) ? url : "";

  /** **fett**, *kursiv*, [Text](Ziel), Zeilenumbruch → HTML. Alles andere ist Text. */
  function inline(text) {
    return escapeHtml(text)
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>")
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, label, url) => {
        const href = safeHref(url);
        if (!href) return label;
        const extern = /^https?:\/\//i.test(href);
        return `<a href="${href}"${extern ? ' target="_blank" rel="noopener noreferrer"' : ""}>${label}</a>`;
      })
      .replace(/\n/g, "<br>");
  }

  /** ## Überschrift, Leerzeile = neuer Absatz. */
  function block(text) {
    return String(text).replace(/\r\n/g, "\n").split(/\n{2,}/).map((part) => {
      const t = part.trim();
      if (!t) return "";
      const h = /^##\s+(.*)$/.exec(t);
      return h ? `<h3>${inline(h[1])}</h3>` : `<p>${inline(t.split("\n").map((l) => l.trim()).join("\n"))}</p>`;
    }).join("");
  }

  // Der Weg zurück: aus dem HTML der Seite den Text fürs Eingabefeld machen.
  function nodeToMarkup(node) {
    let out = "";
    for (const kid of node.childNodes) {
      if (kid.nodeType === 3) { out += kid.nodeValue.replace(/\s+/g, " "); continue; }
      if (kid.nodeType !== 1) continue;
      const inner = nodeToMarkup(kid);
      const tag = kid.tagName;
      if (tag === "BR") out += "\n";
      else if (tag === "STRONG" || tag === "B") out += `**${inner}**`;
      else if (tag === "EM" || tag === "I") out += `*${inner}*`;
      else if (tag === "A") out += `[${inner}](${kid.getAttribute("href")})`;
      else out += inner;
    }
    return out;
  }
  const toMarkup = (el) => nodeToMarkup(el).split("\n").map((l) => l.trim()).join("\n").trim();

  function blockToMarkup(el) {
    return [...el.children].map((kid) =>
      /^H[1-6]$/.test(kid.tagName) ? "## " + toMarkup(kid) : toMarkup(kid)).join("\n\n");
  }

  /** Die Originaltexte und -fotos einer Seite. */
  function readDefaults(doc) {
    const texts = {};
    const images = {};
    doc.querySelectorAll("[data-cms]").forEach((el) => {
      const key = el.dataset.cms;
      if (key in texts) return;
      texts[key] = el.dataset.cmsAttr ? el.getAttribute(el.dataset.cmsAttr) : toMarkup(el);
    });
    doc.querySelectorAll("[data-cms-list]").forEach((el) => {
      texts[el.dataset.cmsList] = [...el.children].map(toMarkup);
    });
    doc.querySelectorAll("[data-cms-block]").forEach((el) => {
      texts[el.dataset.cmsBlock] = blockToMarkup(el);
    });
    doc.querySelectorAll("[data-cms-img]").forEach((el) => {
      images[el.dataset.cmsImg] = el.getAttribute("src");
    });
    return { texts, images };
  }

  /** Carolinas Änderungen in die Seite einsetzen. */
  function apply(content, doc = document) {
    const texts = (content && content.texts) || {};
    const images = (content && content.images) || {};
    doc.querySelectorAll("[data-cms]").forEach((el) => {
      const val = texts[el.dataset.cms];
      if (typeof val !== "string") return;
      if (el.dataset.cmsAttr) el.setAttribute(el.dataset.cmsAttr, val);
      else if (el.tagName === "TITLE" || el.tagName === "OPTION") el.textContent = val;
      else el.innerHTML = inline(val);
    });
    doc.querySelectorAll("[data-cms-list]").forEach((el) => {
      const val = texts[el.dataset.cmsList];
      if (Array.isArray(val)) el.innerHTML = val.map((t) => `<li>${inline(t)}</li>`).join("");
    });
    doc.querySelectorAll("[data-cms-block]").forEach((el) => {
      const val = texts[el.dataset.cmsBlock];
      if (typeof val === "string") el.innerHTML = block(val);
    });
    doc.querySelectorAll("[data-cms-img]").forEach((el) => {
      const val = images[el.dataset.cmsImg];
      if (val) el.src = val;
    });
  }

  window.WortCms = { inline, block, readDefaults, apply };

  if (!document.currentScript || !("apply" in document.currentScript.dataset)) return;
  fetch("/api/content", { headers: { Accept: "application/json" } })
    .then((r) => r.json())
    .then((d) => { if (d && d.ok) apply(d.content); })
    .catch(() => {});
})();
