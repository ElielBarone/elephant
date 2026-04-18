# The goal
## General
Elephant should be a simple flip card.

## Technology
The output should be a simple html + js compatible with github pages
we want to use react and ts
We want to have a strong structure, using hooks and leggo dumb components.
The components page are not linked with the pages
the pages use the component and can read the url
use react-hook-form, zod and https://mui.com/

For **non-trivial algorithms** (especially the **scheduler**), prefer **pure functions**: explicit inputs, explicit return values, no reads or writes to storage, clocks, or the network inside the core logic. Keep **IndexedDB**, **`Date.now`**, and similar effects in **thin wrappers** or hooks that call those functions so behavior stays easy to **unit test** from fixed examples.

The words live in a json file, this json file should have a good structure, like
```
{
    name: 'default english'
    nativeIdiom: ptBR,
    learningIdiom: enUS
    phrases: [
        {
            id: 'generated-id'
        original: 'I have a cat in my pants',
        translated: 'I feel unconfortable'
        }
    ]
}
```
The user can be able to add a new phrases in the json in a simple interface.
The user can create new decks, choosing the languages, for now we want to have br portuguese, english us and for england, and italian

Each deck’s material (phrases JSON, optional audio blobs, and any deck-level metadata) lives under a **logical** path like `elephant/decks/<deckId>/` inside **IndexedDB** on the device—not as a visible phone folder, but as the same structure in the database (object stores or key prefixes).

**Scheduling** (ease factor, interval, due time, phase, lapses, and related fields) is stored in IndexedDB as **one record per card**, keyed by `deckId` and `cardId`. Small UI preferences only (for example last opened deck) may use **localStorage**; do not put large JSON, scheduling, or audio there.

## Feature
The initial screen shows the possible decks, once it is choose, it shows the cards.
The cards will work like anki, and here is some rules.

### Card score

Each card tracks:

Ease Factor (EF)
Starts at ~2.5 (250%)
Controls how fast intervals grow
Interval (I)
Number of days until the next review
Repetitions (n)
Number of successful reviews in a row
Lapses
Number of times you forgot the card
2. Your answer directly changes the math

When you review a card, you choose **three** grades only:

**Hard** — **Good** — **Easy**

Each option updates the card differently:

If you press **Hard**

Use when recall was poor or you did not remember. Strongest penalty: short next interval (including relearning-style steps when the scheduler counts a lapse), **EF decreases**. This single low grade replaces a separate “Again” button.

If you press **Good**

Interval increases using:

I
new
	​

=I
old
	​

×EF

EF stays roughly the same

If you press **Easy**

Interval increases more aggressively:

I
new
	​

=I
old
	​

×EF×1.3

EF slightly increases

3. Ease Factor update rule

After each review, EF is adjusted approximately like:

EF
′
=EF+(0.1−(5−q)(0.08+(5−q)×0.02))

Where:

q = quality score mapped from your button: **Hard = 3**, **Good = 4**, **Easy = 5** (no separate fail button; **Hard** carries the lowest grade).

In plain terms:

Easy → EF increases → intervals grow faster  
Hard → EF decreases → intervals grow slower

Minimum EF is usually capped (~1.3) so cards don’t become impossible.

4. Learning vs Review phases

Anki splits cards into phases:

Learning phase (new cards)
Short steps (e.g., 1 min → 10 min → 1 day)
Not using EF yet
Focus: initial encoding
Review phase
Uses full SM-2 math
Intervals grow exponentially
Relearning (after lapse, typically after **Hard** when counted as a lapse)
Card goes back to short steps
EF is penalized
5. Why it works (intuition)

Anki is approximating your memory decay curve:

If you recall easily → spacing increases
If you struggle → spacing shrinks
Over time → each card converges to its “optimal interval”
6. Key insight (what really defines frequency)

It’s not a fixed “score”—frequency is determined by:

Next Review Date = Today + Interval

And the interval is dynamically shaped by:

Your past answers
The ease factor
The number of successful repetitions
7. Practical takeaway
Press Good most of the time → stable growth
Overusing **Hard** on cards you actually know → shrinks intervals and drags EF down
Overusing Easy → intervals may become too large

### text to speach
When we show the card we want to **hear the phrase spoken in the right language** (for example the **original** line in the **learning** idiom).

**v1:** use the **Web Speech API** (`speechSynthesis` + `SpeechSynthesisUtterance`). Set **`lang`** to a **BCP 47** tag derived from the deck (`learningIdiom` for the original text, or `nativeIdiom` if you add a control for the translation side). Map app enums to tags in one place (for example `ptBR` → `pt-BR`, `enUS` → `en-US`, `enGB` → `en-GB`, `itIT` → `it-IT`). Voices and quality depend on the device; no API keys and no server.

If you later add cloud or pre-generated audio, store clips in **IndexedDB** keyed by **card id** so replays avoid repeat network or paid calls.

Optional Google login or shared API keys are **out of scope for v1** static hosting (see **GitHub Pages and phones**).




# Definitions

Questions to resolve and capture here as agreed terms.

## Data model and naming

1. Is a deck always exactly one pair `(nativeIdiom, learningIdiom)`, or can one deck contain multiple language pairs or mixed content?
Just a simple pair

2. Should "card" mean one phrase row in JSON plus its scheduling state, or is there a distinction you want later (for example one phrase leading to multiple card types)?
each couple original and translation is a card

3. What are the rules for phrase `id`: format (UUID, nanoid), stability across edits, regeneration when text changes?
it can be uuid or some reliable and shorter ID, I don't mind

4. Is `name` in the deck JSON the deck title shown in the UI, or a label for the file or locale metadata?
The user can add a title to the deck, we are going to have some default decks to the app, so the user can choose it, and when the user chose, it **copies into IndexedDB** on the device (see **GitHub Pages and phones**).

## Storage and folders (GitHub Pages)

5. For "user folder for each deck" in the browser, what do you intend: IndexedDB, OPFS, Cache API, ZIP export/import, File System Access API with a user-chosen directory, or something else?
The user should have a elephant/decksIds/files in his cellphone or computer

*Plan:* interpret this as the **IndexedDB layout** above (`elephant/decks/<deckId>/…`). **v1** keeps a **simple** scope: **no user-facing deck export or import** (no ZIP/JSON backup flows). Optional **desktop folder link** is deferred.

6. The plan sketches `localStorage` as `ptBR-enUS: { id: score }` but later describes EF, interval, repetitions, lapses, and phases. Should "score" be replaced by a full scheduling record per card, or do you want both a simple display score and full state?
Use the anki defined score and save it to local storage, or even change the json, what is simpler and light to do

*Plan:* use **full scheduling records per card** in **IndexedDB** (Anki-like fields). Deck JSON in IDB holds **phrases and deck metadata** only; scheduling stays separate for clarity and migrations.

## Scheduling

7. Do you want behavior close to Anki's learning steps and relearning, or a smaller custom ruleset that is only inspired by Anki?
I want it to be close to anki rules

8. For Hard, `q` is listed as 2–3. How should the app pick 2 versus 3? 
we can simplify and choose 3

*Plan:* ratings are **Hard / Good / Easy** only; **Hard** uses **`q = 3`** (see Card score).

9. Will EF be stored as a decimal like `2.5` or as a percentage like `250`, and what is the numeric minimum cap (for example 1.3)?
the shortest and reliable

10. What are the exact initial learning steps (for example 1 minute → 10 minutes → 1 day), and when does a card graduate from learning to review?
lets work with, hours, days, month

11. After "Again" on a mature card, do you want a full relearning queue with short steps or a simplified reset of interval and EF?
reset to the half score

*Plan:* there is no **Again** button; **Hard** on a mature card triggers **Anki-like relearning** (see **GitHub Pages and phones**). The “half score” note is superseded there.

## Text-to-speech and auth

12. Which Google surface do you mean for TTS (for example Cloud Text-to-Speech with an API key), or are you open to browser-only options if they fit GitHub Pages better?
we want to use the api key, but we don't want every user to configure it, we want to configure it once

*Plan (v1):* use **Web Speech API** with **`lang`** from the deck idioms so the phrase is spoken in the intended language on device. Defer Google Cloud TTS (and any shared key behind a proxy) until you need higher quality or consistent voices.

13. How should cached audio be keyed: by phrase `id`, by hash of text, or by text plus voice plus language?
it can be saved with the card id, so it is easy to associate afterwards

# GitHub Pages and phones

These choices match **static hosting on GitHub Pages** and **mobile browsers** (no install required beyond “Add to Home Screen” if you want a PWA).

**Primary data store:** **IndexedDB** for deck content, scheduling, and optional audio blobs on every supported phone and desktop browser. Everything below assumes IDB unless stated as optional.

## Storage and deck layout on device

### Optional: user-chosen `elephant/decks/...` on disk

You can mean: “the user points the app at a place on their phone or computer, and we read and write deck files there as if it were `elephant/decks/...`.”

- **On desktop Chromium (Chrome, Edge, and similar):** mostly **yes**. The **File System Access API** lets the user **pick a folder** once; the site can then **read and write files** inside that folder (for example JSON decks and audio) for that origin until permission is revoked. You can mirror an `elephant/decks/<deckId>/` tree there. It is not a silent path on disk—the user must **choose** the folder and the browser controls access.
- **On typical phones (especially iOS Safari, and many mobile browsers):** **not in the same way**. There is generally **no** stable API to open an arbitrary directory and read/write like a desktop file manager. The user can usually **pick individual files** (import) and **save or share exports** (download / share sheet), but not “live” bidirectional sync to a folder path for all users.
- **If you need real folders on phones like a native app:** ship a **wrapper** (for example **Capacitor** or a small native shell) with filesystem plugins, or keep the web app with **IndexedDB** as the live store and add file-based backup later if you need it.

So: **possible where the browser exposes directory access**; **not something you can rely on for every GitHub Pages user on every phone** without a hybrid or native-style shell.

### IndexedDB layout (v1)

- **Database name:** for example `elephant` (single DB for the app).
- **Suggested stores (or equivalent key prefixes):**
  - `decks` — deck metadata and phrase list (same shape as your deck JSON, plus `id`, `title`, `nativeIdiom`, `learningIdiom`, timestamps).
  - `scheduling` — one object per card: `deckId`, `cardId`, ease, interval, due (timestamp or ISO string), phase, step index, lapses, repetition count, and any other scheduler fields you need.
  - `audio` — optional: `cardId` (or composite key with `deckId`) → `Blob` or reference for cached pronunciation.
- **Versioning:** bump IndexedDB **schema version** when stores or fields change; ship a small **migration** path so existing users are not wiped silently.
- **localStorage** — only tiny preferences (theme, last opened `deckId`). Do not put scheduling, phrases, or blobs there.
- **Default decks** ship as static files in the repo (for example under `public/decks/`). Choosing one **copies** into the `decks` store (and creates default **scheduling** rows for new cards if you want “new” queue behavior). That is **loading bundled content**, not a general import pipeline.

**v1 (simple):** all study data stays in **IndexedDB** on the device. **No** deck **export**, **no** deck **import** from files the user brings (defer JSON/ZIP backup and restore until you want that complexity).

**Later (optional):** **export / import** (JSON or ZIP), **File System Access** “link folder” on desktop, or other backup paths.

## Installable app and offline

- Add a **Web App Manifest** and a **service worker** so the shell loads offline after the first visit and the app can be added to the home screen like an app.
- Cache the built JS/CSS and static deck JSON; study data already lives in IndexedDB on the device.

## Text-to-speech on static hosting

- **v1 (chosen):** **Web Speech API** speaks the phrase **on the device**. Set `SpeechSynthesisUtterance.lang` from the deck (typically **`learningIdiom`** → BCP 47 for the **original** field; use **`nativeIdiom`** when speaking the **translated** side if the UI offers it). Keep a single **idiom → `lang` tag** map in the app. This matches “speak in the desired idiom” without generating audio files.
- A **Google Cloud Text-to-Speech API key baked into the front end is not safe** (anyone can extract it from the bundle or network). A shared key “configured once” only works in practice **behind a backend or serverless proxy**, which is outside pure GitHub Pages.
- **Optional later:** **pre-generated audio** for default decks (repo or public bucket), or **server-side TTS** via a proxy, still keyed by **card id** in IndexedDB if you cache blobs.
- If you later add a **proxy** (Cloudflare Worker, etc.), you can swap the playback source without changing the card model.

## Scheduling defaults (concrete)

- **Rating UI:** three buttons only — **Hard**, **Good**, **Easy** — mapped to **`q = 3`**, **`q = 4`**, **`q = 5`** for the EF rule below. There is no separate **Again**; **Hard** is the lowest grade (forgot or very difficult).
- **Ease factor:** store as a **number** (for example `2.5`), not a percent integer. **Minimum** `1.3`, **Hard** maps to **`q = 3`** (see Definitions).
- **New cards (learning):** use short steps that fit “hours and days” before review, for example **1 hour → 8 hours → 1 day**, then **graduate** to the review phase on the next successful step (same spirit as Anki’s minute-based steps, but easier to reason about on mobile).
- **Review phase:** use the SM-2 style interval and EF updates already described in this doc.
- **Lapses on mature cards:** prefer **Anki-like relearning** (short steps again, EF penalty) so behavior stays close to Anki (see Definitions Q7). The earlier “half score” note is superseded here for implementation parity.

# Plan

## Todo

- [ ] Scaffold **Vite + React + TypeScript**, **MUI**, routing, **react-hook-form** + **zod**, and a GitHub Pages base path config.
- [ ] Add **PWA** (manifest + service worker) so the app installs and the shell works offline on phones.
- [ ] Implement **IndexedDB** (`decks`, `scheduling`, optional `audio`): schema version + migrations, **copy bundled default decks** from static assets into IDB, create/edit custom decks, persist phrases; **scheduling** keyed by `deckId` + `cardId`.
- [ ] Build **deck list** and “add / duplicate / delete deck” flows; wire **default deck** copy from static assets into IndexedDB.
- [ ] Build **study session**: flip card UI, show due ordering, **Hard / Good / Easy** wired to the scheduler.
- [ ] Implement **scheduler** for **Hard / Good / Easy** as **pure functions** (state + rating + “now” in → new state out), with **unit tests** on edge cases (due dates, EF floor, graduation).
- [ ] Add **TTS** with **Web Speech API**: **`lang`** from deck idioms (BCP 47 map); speak **original** with `learningIdiom` by default; optional **IDB** `Blob` cache by **card id** if you add fetched or recorded audio later.
- [ ] Build **phrase editor** (add/edit/delete cards) with validation and stable **card ids** (UUID or nanoid).
- [ ] **Mobile-first** layout (touch targets, safe areas, MUI breakpoints) and smoke test on **iOS Safari** and **Android Chrome**.

## Notes

- Repository can use **GitHub Actions** to build and deploy the `dist` folder to **GitHub Pages** on each push to the default branch.
- Keep secrets out of the client; any future **Google TTS** integration should assume a **server-side or serverless** holder of the key unless using only pre-generated audio.
- Use a small **IndexedDB helper** (for example the **idb** package) to keep open/transaction code readable; avoid scattering raw IDB calls across UI components.
- Keep **time** (`Date`, timestamps for “due”) injected or passed into scheduler calls from the edges so pure functions can be tested with a fixed “now”.
- **v1:** no deck **export/import** UX; users work entirely inside the app’s **IndexedDB** (plus choosing **bundled** defaults from the site).
