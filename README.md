# Grimoire by Continental

Responsive MTG deckbuilder and online tabletop built with React, TypeScript, Vite, Tailwind, and a small WebSocket backend.

## What It Includes

- Live card search against the public [Scryfall API](https://scryfall.com/docs/api)
- Filters for Standard legality, color, type, mana value, and set
- Real card images in a responsive grid
- Click-through card detail modal with larger art and rules text
- Deck add/remove controls with counts, curve, color spread, and average mana value
- `localStorage` persistence for saving, loading, and deleting deck snapshots
- Share-link, import, and export flows for moving decks between browsers
- Room-based online tabletop play with private hands and synchronized public zones
- Split frontend/backend deployment support for GitHub Pages plus a separate play server

## Project Structure

```text
src/
  api/          Scryfall fetch + normalization
  components/   UI split by cards, deck, filters, layout, shared panels
  constants/    MTG options and filter defaults
  hooks/        Card search and set-loading hooks
  play/         Multiplayer provider, storage, and tabletop UI
  state/        Deck builder and localStorage deck persistence
  shared/       Shared multiplayer protocol + deck helpers
  types/        Strong TypeScript models for cards, filters, and decks
  utils/        Formatting and deck stat helpers
server/         Authoritative WebSocket backend + HTTP preview server
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
npm test
npm run test:e2e
```

Local visual captures and browser-test outputs should stay out of git. Use ignored working directories such as `tmp-debug/`, `tmp-visual-audit/`, `output/`, `zone-overlay-check/`, `playwright-report/`, and `test-results/` for generated artifacts.

## Web Metadata And Static Assets

The repo now includes the common static-site assets that belong in source control for this project:

- `index.html` with favicon, manifest, robots meta, and JSON-LD metadata
- `public/robots.txt`
- `public/sitemap.xml`
- `public/manifest.json`
- `public/404.html`
- `public/privacy-policy.html`
- `public/terms-of-service.html`
- `public/data.json`
- `public/favicon.svg`
- `.env.example`

Deployment notes:

- Update `public/sitemap.xml`, `public/data.json`, and the JSON-LD block in `index.html` if you publish the frontend at a domain other than `https://charlemagne404.github.io/Grimoire/`.
- Apache-specific `.htaccess` is intentionally not included because this repo is set up for Caddy or Nginx, not Apache.
- TLS certificate files are server-managed and should not be committed to git. The sample Caddy and Nginx configs cover HTTPS termination and security headers.
- A `LICENSE` file is still an owner decision. Add one only after choosing the actual license terms for the repository.

## Deployment

### Backend on your own server

Build and run the authoritative play server:

```bash
npm install
npm run build:server
HOST=0.0.0.0 PORT=8787 npm run start:server
```

The multiplayer client connects to `/ws` by default. If the frontend is hosted on a different origin, set `VITE_PLAY_SERVER_URL` at frontend build time so the browser connects to your backend origin instead.

Auth and deck-sync requests now use same-origin `/api/auth/*` and `/api/grimoire/*` paths by default. Keep those routes behind your reverse proxy on normal HTTPS `443` and forward them server-side to the auth backend instead of exposing browser traffic to `:5000`.

Example backend target:

```bash
https://mpmc.ddns.net
```

Important: if the frontend is served over HTTPS, the play server must also be reachable over HTTPS/WSS. In practice that means putting the Node server behind a reverse proxy such as Caddy or Nginx and terminating TLS for `mpmc.ddns.net`.

Important: if you want account login to survive restrictive networks, proxy `/api/auth/*` and `/api/grimoire/*` through the same public origin on `443`. Do not make the browser call `https://<host>:5000` directly.

Ready-to-paste deployment files:

- Caddy: `deploy/caddy/Caddyfile`
- Nginx: `deploy/nginx/mpmc.ddns.net.conf`
- systemd service: `deploy/systemd/grimoire-play.service`

Suggested Linux deployment flow:

```bash
sudo mkdir -p /opt/grimoire
sudo chown "$USER":"$USER" /opt/grimoire
cd /opt/grimoire
git clone <your-repo-url> Grimoire
cd Grimoire
npm install
npm run build:server
```

Then:

1. Copy `deploy/systemd/grimoire-play.service` to `/etc/systemd/system/`.
2. Adjust `User`, `Group`, and `WorkingDirectory`.
3. Run `sudo systemctl daemon-reload`.
4. Run `sudo systemctl enable --now grimoire-play`.
5. Install either the Caddy or Nginx config for `mpmc.ddns.net`.

You can confirm the backend before wiring the frontend by visiting:

```bash
https://mpmc.ddns.net/health
```

### Frontend on GitHub Pages

GitHub Pages is static hosting, so build the frontend separately from the backend:

```bash
VITE_PLAY_SERVER_URL=https://mpmc.ddns.net \
VITE_CONTINENTAL_AUTH_BASE_URL=https://mpmc.ddns.net \
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

### GitHub workflows

This repo now includes:

- Pages deployment at `.github/workflows/deploy-pages.yml`
- CI for lint, unit tests, build, and Playwright coverage at `.github/workflows/ci.yml`

Before using it:

1. In GitHub, open `Settings -> Pages`.
2. Set `Source` to `GitHub Actions`.
3. Push to `main` or run the workflow manually from the `Actions` tab.

Optional repository variables:

- `VITE_PLAY_SERVER_URL`
  Default: `https://mpmc.ddns.net`
- `VITE_CONTINENTAL_AUTH_BASE_URL`
  Default: same-origin `/api/*`
  For GitHub Pages or any split-origin frontend, set this to your backend origin on `443`, for example `https://mpmc.ddns.net`
- `PAGES_BASE_PATH`
  Default: `/<repo-name>/`
- `VITE_ROUTER_MODE`
  Default: `hash`

Examples:

- Project Pages site at `https://<user>.github.io/Grimoire/`
  Set `VITE_CONTINENTAL_AUTH_BASE_URL=https://mpmc.ddns.net` and make sure that host proxies `/api/auth/*` and `/api/grimoire/*` on `443`.
- Custom Pages domain at the root
  Set `PAGES_BASE_PATH=/`
