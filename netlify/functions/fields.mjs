// Was im Redaktionsbereich bearbeitbar ist. Die Texte selbst stehen NICHT hier,
// sondern nur in public/index.html und public/success.html: Dort sind sie mit
// data-cms-Attributen markiert, und der Admin-Bereich liest sie direkt aus.
// tests/fields.test.mjs wacht darüber, dass Liste und HTML zusammenpassen.
//
// Feldtypen: line = eine Zeile, text = mehrzeilig, list = Stichpunkte,
//            block = längerer Text mit Zwischenüberschriften

const line = (key, label, hint) => ({ key, label, type: "line", hint });
const text = (key, label, hint) => ({ key, label, type: "text", hint });
const list = (key, label, hint) => ({ key, label, type: "list", hint });

const ANGEBOTE = [
  { id: "hochzeit", titel: "Ehegelübde & Traureden" },
  { id: "geburtstag", titel: "Geburtstags- & Jubiläumsreden" },
  { id: "trauer", titel: "Trauerreden" },
  { id: "business", titel: "Business Poesie", text2: "Hinweis unter den Stichpunkten" },
  { id: "baby", titel: "Baby Blessings", text: "Blessingway: Text", list: "Blessingway: Stichpunkte", text2: "Namensfest: Text", list2: "Namensfest: Stichpunkte" },
];

function angebotPanel(a) {
  const k = "angebot." + a.id + ".";
  const fields = [
    line(k + "name", "Name auf der Karte"),
    text(k + "desc", "Kurztext auf der Vorderseite"),
    line(k + "anlaesse", "Zeile oben auf der Rückseite"),
    text(k + "text", a.text || "Text auf der Rückseite"),
    list(k + "list", a.list || "Stichpunkte"),
  ];
  if (a.text2) fields.push(text(k + "text2", a.text2));
  if (a.list2) fields.push(list(k + "list2", a.list2));
  fields.push(line(k + "preis", "Preis"));
  return { tab: "angebote", title: a.titel, sub: "Vorder- und Rückseite dieser Karte.", fields };
}

const SCHRITTE = ["Erster Schritt", "Zweiter Schritt", "Dritter Schritt", "Vierter Schritt", "Fünfter Schritt"];

export const TABS = [
  { id: "start", label: "Start & Über mich" },
  { id: "angebote", label: "Angebote" },
  { id: "stimmen", label: "Stimmen" },
  { id: "ablauf", label: "Der Ablauf" },
  { id: "cafe", label: "Café Satz" },
  { id: "kontakt", label: "Anfrage" },
  { id: "rechtliches", label: "Impressum" },
];

export const PANELS = [
  { tab: "start", title: "Ganz oben", sub: "Der erste Eindruck: Leitsatz unter dem Logo.", fields: [
    text("hero.tagline", "Leitsatz", "Zeilenumbruch = neue Zeile auf der Seite."),
    line("hero.scroll", "Kleines Wort über dem Strich"),
  ] },
  { tab: "start", title: "Drei Spalten", sub: "Direkt unter dem großen Foto.", fields: [
    line("pillar.1.title", "1. Überschrift"), text("pillar.1.text", "1. Text"),
    line("pillar.2.title", "2. Überschrift"), text("pillar.2.text", "2. Text"),
    line("pillar.3.title", "3. Überschrift"), text("pillar.3.text", "3. Text"),
  ] },
  { tab: "start", title: "Leitgedanke", sub: "Der große Satz unter den drei Spalten.", fields: [
    text("catchphrase", "Text"),
  ] },
  { tab: "start", title: "Über mich", sub: "Deine Geschichte neben dem Foto.", fields: [
    line("about.label", "Kleine Zeile darüber"),
    line("about.title", "Überschrift"),
    text("about.text1", "Erster Absatz"),
    text("about.text2", "Zweiter Absatz"),
    text("about.text3", "Kursiver Absatz über den roten Faden"),
    line("cta.about", "Beschriftung des Buttons darunter"),
  ] },
  { tab: "start", title: "Menü und Fußzeile", sub: "Die Einträge oben im Menü und die Zeile ganz unten.", fields: [
    line("nav.logo1", "Name oben links, erster Teil"),
    line("nav.logo2", "Name oben links, zweiter Teil"),
    line("nav.ueber", "Menü: Über mich"),
    line("nav.angebote", "Menü: Angebote"),
    line("nav.ablauf", "Menü: Der Ablauf"),
    line("nav.anfrage", "Menü: Anfrage"),
    line("footer.name", "Fußzeile: Name"),
    line("footer.person", "Fußzeile: Person"),
    line("footer.copy", "Fußzeile: Copyright"),
  ] },
  { tab: "start", title: "Suchmaschinen", sub: "Was Google als Titel und Beschreibung sieht. Die Vorschau beim Teilen in WhatsApp & Co. ändert sich dadurch nicht.", fields: [
    line("seo.title", "Seitentitel", "Etwa 50–60 Zeichen."),
    text("seo.description", "Beschreibung", "Etwa 140–160 Zeichen."),
  ] },

  { tab: "angebote", title: "Überschrift der Angebote", sub: "Steht über den fünf Karten.", fields: [
    line("angebote.label", "Kleine Zeile darüber"),
    line("angebote.title", "Überschrift"),
    line("angebote.hint", "Hinweis zum Anklicken"),
    line("angebot.preislabel", "Wort über dem Preis (gilt für alle Karten)"),
    line("angebot.cta", "Button auf der Rückseite (gilt für alle Karten)"),
    line("cta.angebote", "Button unter den Karten"),
    line("cta.hint", "Satz unter den Buttons", "Steht auch unter „Über mich“ und im Anfrage-Formular."),
  ] },
  ...ANGEBOTE.map(angebotPanel),

  { tab: "stimmen", title: "Überschrift", sub: "Steht neben den kreisenden Stimmen.", fields: [
    line("stimmen.label", "Kleine Zeile darüber"),
    line("stimmen.title", "Überschrift"),
  ] },
  ...[1, 2, 3, 4].map((n) => ({ tab: "stimmen", title: "Stimme " + n, sub: "", fields: [
    text("stimme." + n + ".text", "Text"),
    line("stimme." + n + ".name", "Name"),
  ] })),

  { tab: "ablauf", title: "Überschrift", sub: "Steht über den fünf Schritten.", fields: [
    line("ablauf.label", "Kleine Zeile darüber"),
    line("ablauf.title", "Überschrift"),
  ] },
  ...SCHRITTE.map((titel, i) => ({ tab: "ablauf", title: titel, sub: "", fields: [
    line("schritt." + (i + 1) + ".title", "Überschrift"),
    text("schritt." + (i + 1) + ".text", "Text"),
  ] })),

  { tab: "cafe", title: "Café Satz", sub: "Der Abschnitt über das besondere Angebot.", fields: [
    line("cafe.intro", "Großer Satz darüber"),
    line("cafe.label", "Kleine Zeile"),
    line("cafe.title", "Überschrift"),
    text("cafe.lead", "Einleitungssatz"),
    text("cafe.text", "Text"),
    text("cafe.origin", "Die Geschichte dazu"),
    line("cafe.cta", "Beschriftung des Buttons"),
  ] },
  { tab: "cafe", title: "Eckdaten", sub: "Die vier Zeilen mit Wo, Dauer, Preis und Instagram.", fields: [
    line("cafe.wo.label", "Wo: Bezeichnung"), line("cafe.wo.text", "Wo: Angabe"),
    line("cafe.dauer.label", "Dauer: Bezeichnung"), line("cafe.dauer.text", "Dauer: Angabe"),
    line("cafe.preis.label", "Preis: Bezeichnung"), line("cafe.preis.text", "Preis: Angabe"),
    line("cafe.insta.label", "Instagram: Bezeichnung"),
    line("cafe.insta.text", "Instagram: Angabe", "Als Link: [Sichtbarer Text](https://…)"),
  ] },

  { tab: "kontakt", title: "Anfrage", sub: "Die Überschrift und das Formular.", fields: [
    line("kontakt.label", "Kleine Zeile darüber"),
    line("kontakt.title", "Überschrift"),
    text("kontakt.intro", "Einleitung"),
    line("form.name.label", "Feld Name: Bezeichnung"),
    line("form.name.ph", "Feld Name: Hinweis im Feld"),
    line("form.email.label", "Feld E-Mail: Bezeichnung"),
    line("form.email.ph", "Feld E-Mail: Hinweis im Feld"),
    line("form.anlass.label", "Feld Anlass: Bezeichnung"),
    line("form.anlass.ph", "Feld Anlass: Hinweis im Feld"),
    line("form.anlass.1", "Anlass 1"), line("form.anlass.2", "Anlass 2"), line("form.anlass.3", "Anlass 3"),
    line("form.anlass.4", "Anlass 4"), line("form.anlass.5", "Anlass 5"), line("form.anlass.6", "Anlass 6"),
    line("form.text.label", "Feld Nachricht: Bezeichnung"),
    line("form.text.ph", "Feld Nachricht: Hinweis im Feld"),
    line("form.submit", "Button zum Absenden"),
  ] },
  { tab: "kontakt", title: "Danke-Seite", sub: "Erscheint, nachdem jemand das Formular abgeschickt hat.", fields: [
    line("danke.title", "Überschrift"),
    text("danke.text", "Text"),
    line("danke.label", "Kleine Zeile über dem Termin"),
    line("danke.cal", "Überschrift über dem Kalender"),
    text("danke.hint", "Text über dem Kalender"),
    line("danke.back", "Link zurück zur Startseite"),
  ] },

  { tab: "rechtliches", title: "Impressum und Datenschutz", sub: "Pflichtangaben, sie liegen in deiner Verantwortung.", fields: [
    line("impressum.toggle", "Beschriftung zum Aufklappen"),
    { key: "impressum.text", label: "Text", type: "block" },
  ] },
];

/** Austauschbare Fotos. `default` ist die Datei im Repo. */
export const IMAGE_SLOTS = [
  { key: "hero", label: "Großes Foto oben", default: "fotos/caro_writing_3_e.png", note: "Hochformat passt am besten." },
  { key: "about", label: "Über mich", default: "fotos/uber_mich.png", note: "Steht neben deiner Geschichte." },
  { key: "stimmen", label: "Mitte der Stimmen", default: "fotos/writing.png", note: "Um dieses Foto kreisen die Stimmen." },
  { key: "ablauf1", label: "Der Ablauf, links", default: "fotos/caro_serious_oval.png", note: "Ovale, freigestellte Fotos passen am besten." },
  { key: "ablauf2", label: "Der Ablauf, rechts", default: "fotos/caro-speaking_smile_oval.png", note: "Ovale, freigestellte Fotos passen am besten." },
  { key: "cafe", label: "Café Satz", default: "fotos/caro_smiling_2.jpg", note: "Steht neben dem Text über Café Satz." },
];

export const FIELD_TYPES = new Map(PANELS.flatMap((p) => p.fields).map((f) => [f.key, f.type]));
const IMAGE_KEYS = new Set(IMAGE_SLOTS.map((s) => s.key));

const MAX_LEN = { line: 300, text: 4000, block: 40000 };
const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

/**
 * Macht aus beliebigen Eingaben gültige Änderungen. Gespeichert werden nur
 * Abweichungen vom Original. Leeres Feld = Original, unbekannte Felder fliegen raus.
 */
export function sanitizeContent(saved) {
  const out = { texts: {}, images: {} };
  if (!isObj(saved)) return out;

  if (isObj(saved.texts)) {
    for (const [key, val] of Object.entries(saved.texts)) {
      const type = FIELD_TYPES.get(key);
      if (!type) continue;
      if (type === "list") {
        if (!Array.isArray(val)) continue;
        const items = val.filter((t) => typeof t === "string" && t.trim()).map((t) => t.trim().slice(0, 500)).slice(0, 20);
        if (items.length) out.texts[key] = items;
      } else if (typeof val === "string" && val.trim()) {
        const clean = val.replace(/\r\n/g, "\n").trim().slice(0, MAX_LEN[type]);
        out.texts[key] = type === "line" ? clean.replace(/\s*\n\s*/g, " ") : clean;
      }
    }
  }
  if (isObj(saved.images)) {
    for (const [key, val] of Object.entries(saved.images)) {
      if (IMAGE_KEYS.has(key) && typeof val === "string" && /^\/api\/media\/[A-Za-z0-9._-]+$/.test(val)) {
        out.images[key] = val;
      }
    }
  }
  return out;
}
