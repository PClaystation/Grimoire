Original prompt: You are extending an existing MTG deckbuilder web app into an online multiplayer digital tabletop play mode. Add room-based online play on the same website with 2-6 players, hidden/private hand data, shared real-time public zones, a server-authoritative WebSocket backend, required `/play` routes, and a desktop-first responsive multiplayer board while reusing existing deck models, card data, and card image components where possible.

2026-03-15
- Inspected the current repo. Reusable pieces identified: `SavedDeck`/`MagicCard` types, `useSavedDecks`, card image/detail UI, and the existing playtest shuffle/draw patterns.
- Main gaps identified: no router, no backend server, no real-time transport, and no multiplayer state model yet.
- Planned architecture: shared TypeScript protocol/types, small Node WebSocket server, React Router pages for play flow, and a client socket store that merges public game state with local private hand state.
- Added shared multiplayer protocol models under `src/shared/` and a Node WebSocket server under `server/` with authoritative room/game state, private hand snapshots, public battlefield/graveyard/exile payloads, and lobby/game actions.
- Added client routing, a persistent play session/socket provider, `/play` pages, lobby deck selection using existing saved decks, and the first pass of the multiplayer tabletop UI with public battlefield and private hand rendering.
- Verification:
  - `npm run build` passed.
  - `npm run lint` passed.
  - Ran a live two-browser Playwright check against `npm run preview`: host created a room, second browser joined with the room code, both selected saved decks, host started the game, private hands stayed isolated per browser, battlefield/graveyard updates synchronized, and tap activity propagated to both clients.
  - Captured validation screenshots in `artifacts/playwright/alice-game.png` and `artifacts/playwright/bob-game.png`.
- Deployment follow-up:
  - Added `VITE_PLAY_SERVER_URL` so a static frontend can target a separate multiplayer backend origin.
  - Added configurable router mode (`browser` vs `hash`) so GitHub Pages can use hash routing without changing app code.
  - Added `VITE_BASE_PATH` support in Vite config plus `build:client`, `build:server`, and `start:server` scripts for split frontend/backend deployment.
  - Documented GitHub Pages + separate backend deployment steps in `README.md`.
