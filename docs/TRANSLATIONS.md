# Translation guide – Polish and Hungarian review

The Crisis Handbook (*Krízová príručka*) is written in Slovak and translated into Czech, English, Polish and Hungarian. The **Polish and Hungarian versions have not yet been reviewed by a native speaker**. Until they are, the app and the PDFs show an “unverified translation” notice in those languages.

This guide is for native speakers who review or improve the Polish or Hungarian text. You do not need to be a programmer.

## What to review

| Part | File(s) | Size |
|---|---|---|
| Book chapters (36) | `content/pl/*.md`, `content/hu/*.md` | the largest part |
| App manual (PDF) | `content/navod/pl.md`, `content/navod/hu.md` | about 11 pages |
| App interface (buttons, menus, messages) | `src/i18n/pl/ui.js`, `src/i18n/hu/ui.js` | about 740 short texts |
| App data (crisis steps, checklists, countries, FAQ, stories) | `src/i18n/pl/data.js`, `src/i18n/hu/data.js` | about 1,300 texts |

### Priorities

Start with the parts where a mistake could put someone at risk:

1. **Local facts**: emergency numbers, siren and warning signals, official alert systems and authorities, and helplines. Polish sources: Alert RCB, gdziesieukryc.pl, MSWiA sirens, IMGW. Hungarian sources: MoLaRi, 104/105/107, HungaroMet, katasztrófavédelem. These are in:
   - `content/<lang>/varovanie.md` (warning and alerts),
   - `content/<lang>/ukrytie.md` (shelter),
   - `content/<lang>/zdroje.md`, sections `#zdroje-pl` and `#zdroje-hu`,
   - the Poland/Hungary entries in the app's *European countries* screen (`data.js`).

   The sources used are listed in `research/notes.md`.
2. **Crisis now** steps (`data.js`, texts from `src/data/crises.js`). People read these under stress, so they must be short and clear.
3. **Chapters on acute danger**: `jadrova` (nuclear), `chemicka` (chemical), `prva-pomoc` (first aid), `povodne` (floods), `vypadok-elektriny` (power outage).
4. Everything else: style, terminology, natural wording.

## How to review without installing anything

**Read in the app.** Open the app and pick the language in the header (PL or HU). You can also add `?lang=pl` or `?lang=hu` to the address. The handbook is under **Handbook**, the manual under **More → Help**.

**Read the PDFs.** `downloads/krizova-prirucka-pl.pdf`, `…-hu.pdf`, `navod-aplikacia-pl.pdf`, `navod-aplikacia-hu.pdf` on the website.

**Send corrections** in whichever way suits you:

- **As a list:** chapter or screen, the current text and the corrected text. The project owner will apply it.
- **Directly on GitHub:** open the file, click the pencil icon (*Edit*), make the change, and choose *Commit changes* (preferably to a new branch with a pull request).

## Rules for editing the files

### Book and manual (`.md`, Markdown)

Translate only the text. Keep these exactly as they are:

- `{#section-id}` after headings – these are link targets;
- link targets in `[text](#target)` – translate the text in square brackets, but not the target in round brackets;
- `{{placeholder:name}}` – tables and lists are inserted here automatically;
- block markers such as `::: choices`, `::: tip`, `:::` and classes such as `{.if-kids}`;
- `![caption](shot:name)` in the manual – translate the caption only.

The build checks that every language has the same section IDs and placeholders as the Slovak original, and reports any differences.

### Interface (`ui.js`)

```js
'now.nextStep': 'Następny krok',
'book.found': ['Znaleziono: {n} miejsce', 'Znaleziono: {n} miejsca', 'Znaleziono: {n} miejsc'],
```

- The left side (the key) never changes. Translate only the text on the right.
- Keep `{n}`, `{name}` and other `{…}` placeholders.
- **Polish plurals** use three forms: `[1, 2–4, 5+]` (for example *1 krok, 2 kroki, 5 kroków*). Hungarian uses a single form.
- Keep texts short: buttons and tabs have limited space on a phone. The tab labels (`tab.*`) should ideally be one word.

### Data (`data.js`)

```js
"Act now": "Działaj teraz",
"What do you need now? Choose your next step:": "Czego teraz potrzebujesz? Wybierz następny krok:",
```

The key on the left is the **English** source text. Do not change it, or the translation will no longer be found. Translate only the right side.

## Tone and terminology

- Address the reader informally (Polish *ty*, Hungarian *te*), as the Slovak and Czech versions do.
- Use short sentences and the imperative for actions: “Turn off the gas”, not “The gas should be turned off”.
- Use the official terms of your country's civil protection. Polish examples: *schron*, *miejsce doraźnego schronienia*, *Rządowe Centrum Bezpieczeństwa*. Hungarian examples: *óvóhely*, *katasztrófavédelem*, *riasztás*.
- Show prices in the local currency. The app converts them automatically from euros (PLN, HUF), so do not convert numbers in the text by hand.

## When the review is finished

In `src/data/ui.js`, remove `unverified: true` from the reviewed language:

```js
{ id: 'pl', name: 'Polski', short: 'PL' },
```

After the next build and deploy, the notices disappear from the app, the PDFs and the EPUBs. If you would like to be credited, tell the project owner. The *About* screen has a “Licences and credits” section.

## For developers

```bash
npm run i18n          # how many texts are missing, placeholder checks
npm run build:web     # quick build without PDF
npm run test:quick    # quick automatic tests
```

More detail is in the Slovak technical documentation: [TECHNICKA-DOKUMENTACIA.md](TECHNICKA-DOKUMENTACIA.md), section 6.
