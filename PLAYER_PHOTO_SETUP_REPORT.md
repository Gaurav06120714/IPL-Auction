# Player Photo System — Setup Report

Generated for the IPL Fantasy Auction project.

## Summary

| Metric | Value |
|--------|-------|
| Total players in database | **57** |
| Photos found (local) | **43** |
| Photos missing | **14** |
| Photo source | **Wikimedia Commons / Wikipedia** — CC / public-domain / GODL-India, reuse-permitted with attribution |
| Attributions | `frontend/public/images/players/ATTRIBUTIONS.md` |
| Drive sync status | Available (`npm run sync:players`) — for adding your own licensed photos |
| Runtime image source | **Local files only** (`/images/players/*.jpg`) — no external URLs |
| Build | ✅ passing (`vite build`) |
| Desktop card | ✅ verified |
| Mobile card | ✅ verified |
| Broken images / alt-text leaks | ✅ none |

> All 57 players currently render the **generated avatar fallback** (a category-tinted
> monogram). As soon as real photos are synced or dropped in, they replace the avatars
> automatically — no code changes required.

## How it works (fallback chain)

Each card resolves its visual in strict priority order:

1. **Real photo** — `public/images/players/<slug>.jpg`, faded in after it decodes.
2. **Generated avatar** — category-tinted gradient ring + initials (GOAT = gold, capped = silver, uncapped = green).
3. **Initials monogram** — always rendered as the base layer.

A loading skeleton shows while a photo is fetching. On a missing/failed image the
`<img>` is removed (its `alt` is empty), so there is **never** a broken-image icon or
alt-text leakage.

## Folder structure

```
ipl-auction/
├── frontend/
│   ├── public/
│   │   └── images/
│   │       └── players/
│   │           ├── <slug>.jpg          ← real photos go here (e.g. virat-kohli.jpg)
│   │           ├── missing-photos.json ← auto-generated list of players w/o a photo
│   │           └── README.md           ← filename guide for all 57 players
│   └── src/
│       ├── data/
│       │   └── player-images.ts        ← auto-generated name → local-path map
│       └── components/
│           └── player-card.tsx         ← renders the fallback chain
├── scripts/
│   └── sync-player-photos.js           ← Google Drive sync
└── package.json                        ← defines `npm run sync:players`
```

## Filename convention

Player name → lowercase, accents stripped, non-alphanumerics → `-`:

| Player | File |
|--------|------|
| Virat Kohli | `virat-kohli.jpg` |
| MS Dhoni | `ms-dhoni.jpg` |
| AB de Villiers | `ab-de-villiers.jpg` |

The full list of all 57 expected filenames is in
`frontend/public/images/players/README.md`.

## Usage

### Option A — Sync from Google Drive (automated)

1. Create a Google Drive folder named exactly **`IPL Player Photos`**.
2. Add player images named after the players (any of `.jpg` / `.jpeg` / `.png`),
   e.g. `Virat Kohli.png`, `MS Dhoni.jpeg`.
3. Install the optional sync dependencies (once, at repo root):
   ```bash
   npm i -D googleapis sharp
   ```
4. Provide read-only Drive credentials (one of):
   - `GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json`
     (share the folder with the service-account email), **or**
   - `GOOGLE_OAUTH_TOKEN=/path/to/authorized_user.json`
5. Run:
   ```bash
   npm run sync:players
   ```

The script downloads each match, converts to JPG, square-crops to 512×512
(face-attention), writes to `public/images/players/`, and regenerates both
`player-images.ts` and `missing-photos.json`.

### Option B — Add photos manually

Drop correctly-named `.jpg` files into `frontend/public/images/players/`.
Re-run `npm run sync:players` to refresh `missing-photos.json` (optional — cards
pick up new files on the next load regardless).

## Offline guarantee

After a sync, every photo is a local file under `public/`. No external URLs are
fetched at runtime, so the cards load instantly and the app works fully offline.

## Notes

- The project has no ESLint config, so there is no `lint` script; `vite build`
  (which type-checks the bundled graph) is the verification gate and passes.
- The player roster is read from `backend/src/db/seed.ts`, the single source of
  truth, so the mapping always matches the seeded database.
