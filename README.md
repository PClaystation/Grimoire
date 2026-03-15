# Grimoire Deckbuilder

Responsive MTG deckbuilder built with React, TypeScript, Vite, and Tailwind.

## What It Includes

- Live card search against the public [Scryfall API](https://scryfall.com/docs/api)
- Filters for Standard legality, color, type, mana value, and set
- Real card images in a responsive grid
- Click-through card detail modal with larger art and rules text
- Deck add/remove controls with counts, curve, color spread, and average mana value
- `localStorage` persistence for saving, loading, and deleting deck snapshots
- Modular project structure for future expansion into multiplayer systems

## Project Structure

```text
src/
  api/          Scryfall fetch + normalization
  components/   UI split by cards, deck, filters, layout, shared panels
  constants/    MTG options and filter defaults
  hooks/        Card search and set-loading hooks
  state/        Deck builder and localStorage deck persistence
  types/        Strong TypeScript models for cards, filters, and decks
  utils/        Formatting and deck stat helpers
```

## Development

```bash
npm install
npm run dev
```

## Verification

```bash
npm run build
npm run lint
```

## Deployment

### Backend on your own server

Build and run the authoritative play server:

```bash
npm install
npm run build:server
HOST=0.0.0.0 PORT=8787 npm run start:server
```

The multiplayer client connects to `/ws` by default. If the frontend is hosted on a different origin, set `VITE_PLAY_SERVER_URL` at frontend build time so the browser connects to your backend origin instead.

Example backend target:

```bash
https://mpmc.ddns.net
```

Important: if the frontend is served over HTTPS, the play server must also be reachable over HTTPS/WSS. In practice that means putting the Node server behind a reverse proxy such as Caddy or Nginx and terminating TLS for `mpmc.ddns.net`.

### Frontend on GitHub Pages

GitHub Pages is static hosting, so build the frontend separately from the backend:

```bash
VITE_PLAY_SERVER_URL=https://mpmc.ddns.net \
VITE_ROUTER_MODE=hash \
VITE_BASE_PATH=/Grimoire/ \
npm run build:client
```

Then publish the generated `dist/` directory to GitHub Pages.

Notes:

- Use `VITE_BASE_PATH=/Grimoire/` for a project site like `https://<user>.github.io/Grimoire/`.
- Use `VITE_BASE_PATH=/` if you publish at the domain root instead.
- `VITE_ROUTER_MODE=hash` avoids GitHub Pages SPA refresh problems because Pages does not provide app rewrites.
- If you later move the frontend off GitHub Pages and onto a host with SPA rewrites, use `VITE_ROUTER_MODE=browser`.
