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
  - Added `.github/workflows/deploy-pages.yml` for automatic GitHub Pages deploys from `main`.
  - Added ready-to-paste Caddy, Nginx, and systemd deployment files under `deploy/`.
  - Updated the Node server to return a simple backend-only status response when frontend assets are not present on the server.
- Live table revamp started:
  - Expanded the shared play protocol and server model to support command zone data, commander starting life, battlefield positions, counters, token permanents, permanent notes, control changes, multi-card draw, and untap-all actions.
  - Added command-zone bootstrap heuristics for commander games and widened client message validation for the richer tabletop action set.
  - Replaced the old stacked-panel game page with a board-first table view: compact HUD, smaller game nav, per-player battlefield lanes, drag-and-drop placement, a persistent overlapping hand tray, a side inspector, a focused public-zone browser, and a token workshop.
  - Added stable automation hooks on the live table (`data-testid`/data attributes) and a Playwright validation script under `scripts/validate-play-table.mjs` that seeds two commander decks, spins up a real room, starts a game, performs table actions, and captures refreshed screenshots.
  - Verification:
    - `npm run build` passed.
    - `npm run lint` passed.
    - Ran `node scripts/validate-play-table.mjs http://127.0.0.1:8787` against the built preview server and captured updated battle-screen screenshots in `artifacts/playwright/revamp/alice-table.png` and `artifacts/playwright/revamp/bob-table.png`.
    - Ran the required skill Playwright smoke client against `/play` and captured `artifacts/playwright/web-game-client-smoke/shot-0.png`.
- Reliability hardening pass:
  - Added strict server-side WebSocket message validation plus a `ws` payload cap so malformed client messages no longer reach the authoritative game logic and crash it.
  - Extended `session_ready` with active room/game IDs so reconnects can clear stale room/game state when the backend no longer has that session attached.
  - Hardened browser persistence paths: play session storage now falls back to memory when `localStorage` is blocked, and saved-deck writes now fail cleanly instead of mutating UI state after a storage exception.
  - Added a clipboard utility with a DOM fallback and wired it into deck exports/share links and lobby room-code copy.
  - Tightened deck/share import validation so malformed JSON payloads are rejected and non-positive quantities are skipped instead of entering invalid deck state.
  - Removed the unused `src/App 2.tsx` scaffold file.
- Verification:
  - `npm run lint` passed.
  - `npm test` passed with new coverage for client message validation and share/deck import validation.
  - `npm run build` passed.
  - `npm audit` passed with no reported vulnerabilities.
  - Ran `npm run preview`, verified `GET /health`, `GET /`, and executed a two-client `/ws` smoke test covering malformed-message rejection, room creation/join, deck selection, game start, draw, and battlefield sync.
- Follow-up:
  - The `develop-web-game` Playwright client could not be executed in this environment because the external `playwright` runtime package is not installed. Runtime verification used direct HTTP/WebSocket smoke tests instead.

2026-03-15
- Battle-screen convenience pass:
  - Shrunk the inspector art, moved core card actions up beside the preview, and converted counters/note/control tools into collapsible inspector sections to cut constant scrolling.
  - Replaced the three labeled battlefield rows with a simpler open playmat plus a dedicated mana shelf, added visible mana-cost chips on table cards, reduced hand/battlefield card footprints, and added direct tap/untap buttons on permanents.
  - Updated battlefield card rendering so the whole card frame rotates when tapped, not just the image, and aligned server auto-placement so lands land lower on the board and action cards sit in the main play area.
- Validation follow-up:
  - Updated `scripts/validate-play-table.mjs` to open the new inspector note section and switch to the `Tokens` utility tab before creating a token.
  - `npm run build` passed.
  - `npm run lint` passed.
  - Ran `node scripts/validate-play-table.mjs http://127.0.0.1:8787` successfully against the preview server and refreshed `artifacts/playwright/revamp/alice-table.png` and `artifacts/playwright/revamp/bob-table.png`.
  - Ran the required `develop-web-game` smoke client against `http://127.0.0.1:8787/play` and refreshed `artifacts/playwright/web-game-client-smoke/shot-0.png`.

2026-03-15
- Multiplayer connection resilience pass:
  - Added a 5 second server-side disconnect grace window so brief websocket drops during play do not immediately mark a player offline or reassign lobby state before the client has a chance to reconnect.
  - Added server websocket heartbeats so idle or marginal proxy/network paths are less likely to silently drop active game sessions.
  - Added `tests/playServer.test.ts` coverage for reconnect-before-timeout and disconnect-after-timeout behavior.

2026-03-15
- Multi-tab websocket loop fix:
  - Reproduced a live reconnect loop caused by `PlayProvider` mounting on every route: a deckbuilder tab at `/` and a play tab in the same browser shared one stored session ID and kept replacing each other’s websocket connection.
  - Scoped `PlayProvider` to `/play` routes only, so non-play tabs no longer open multiplayer sockets.
  - Updated the client close handler to stop auto-reconnecting after server close code `4001` (`Replaced by a newer connection.`) and surface a user-facing message instead.

2026-03-15
- Continental branding pass:
  - Copied the provided Continental C2 mark and Continental wordmark into `public/branding/` so they are available in the production build.
  - Added a shared `ContinentalBranding` layout component and used it in the main nav plus the deckbuilder and `/play` hero panels to make Grimoire visibly branded without overwhelming the existing interface.
  - Updated the HTML metadata title/description to present the app as `Grimoire by Continental`.
- Verification:
  - `npm run build` passed.
  - `npm run lint` passed.
  - Ran the `develop-web-game` Playwright smoke client against `http://127.0.0.1:8787/` and `http://127.0.0.1:8787/play`, then visually reviewed `artifacts/playwright/branding-home/shot-0.png` and `artifacts/playwright/branding-play/shot-0.png`.

2026-03-15
- Public polish pass:
  - Reworked the shared Continental signature lockup so the wordmark sits on a centered baseline with the C2 mark instead of hanging slightly low inside the hero badge.
  - Fixed the branding asset paths to respect `import.meta.env.BASE_URL`, so the Continental graphics now load correctly on GitHub Pages and other non-root deployments.
  - Added release-facing metadata and a base-path-safe favicon reference in `index.html`.
  - Added global dark color-scheme, focus-visible outlines, textarea font inheritance, and reduced-motion handling in `src/index.css`.
  - Tightened play route forms with max lengths, autocomplete/casing hints, and disabled submit states for disconnected or incomplete room joins.
  - Added `aria-live` status messaging in the deckbuilder and room lobby, plus richer lobby deck summaries and pressed-state affordances.
  - Added basic HTTP hardening/caching headers to the Node preview/play server and refreshed the README summary so it matches the shipped product.
- Verification:
  - `npm run build` passed.
  - `npm run lint` passed.
  - `npm test` passed.
  - `npm audit --omit=dev` passed with 0 vulnerabilities.
  - Ran `node scripts/validate-play-table.mjs http://127.0.0.1:8787` against the built preview server and visually reviewed the refreshed live-table screenshot in `artifacts/playwright/revamp/alice-table.png`.
  - Ran the required `develop-web-game` Playwright smoke client against `http://127.0.0.1:8787/` and `http://127.0.0.1:8787/play`, then captured cleaner top-of-page verification screenshots in `artifacts/playwright/public-home-top.png` and `artifacts/playwright/public-play-top.png`.
  - Confirmed preview HTTP headers with `curl -I` for `/`, `/health`, and the hashed frontend asset route under `/assets/`.

2026-03-18
- Feedback fix pass:
  - Deck builder:
    - Added a dedicated subtype/tag search field and wired it into the Scryfall query builder.
    - Reworked search and gallery card previews so the actual card frame stays visible with `object-contain` instead of cropped/overlaid art.
    - Compressed the deck-builder hero/header copy and moved the main workspace ahead of the deck panel on smaller screens to reduce top-of-page fluff and improve mobile flow.
  - Tabletop:
    - Extended the shared play protocol, server snapshots, and validation to expose each player’s library privately to its owner.
    - Added a searchable local library browser, visible library/graveyard access in the table UI, and direct library-to-zone movement for tutor-style play.
    - Added server-authoritative battlefield stacks with stack/unstack actions and stack-aware board rendering so crowded boards can be compressed without losing interaction.
- Verification:
  - `npm run build` passed.
  - `npm run lint` passed.
  - `npm test` passed with new coverage for library moves and stacking.
  - Ran `node scripts/validate-play-table.mjs http://127.0.0.1:8787` successfully and refreshed `artifacts/playwright/revamp/alice-table.png` and `artifacts/playwright/revamp/bob-table.png`.
  - Ran the required `develop-web-game` Playwright smoke client against `http://127.0.0.1:8787/play` and visually reviewed `output/web-game/shot-0.png`.
- Follow-up:
  - Stacked cards remain easiest to select from the top visible card; the inspector’s unstack action is the escape hatch when a pile gets too dense.

2026-03-19
- Continental ID cloud-sync hardening pass:

2026-03-21
- Opponent zone-rail compression pass:
  - Added a compact rail mode for non-local battlefield lanes so opponent pile access stays available but the rail reads much smaller than the local seat.
  - Shrunk the opponent lane rail column, reduced pile card footprints, tightened rail spacing, and muted the opponent rail copy so it no longer competes with the board.
  - Verification:
    - `npm run build` passed.
    - Visually reviewed the refreshed opponent-lane layout in `artifacts/playwright/revamp/alice-table.png`.
  - Reviewed the authenticated deck sync path end-to-end and tightened the storage model so anonymous local decks, per-account cloud caches, and retryable pending imports are kept in separate local-storage buckets.
  - Fixed the retry path for failed cloud imports: pending deck uploads are now tracked per Continental ID account and still upload later even if newer cloud activity advances the account-wide `lastSyncedAt`.
  - Extended the deck repository result model to expose sync health (`ready`, `pending`, `offline`) plus user-facing sync messaging, then surfaced that state in the deckbuilder/account UI so public users can tell when decks are fully synced versus queued locally for retry.
  - Tightened local preview auth defaults so loopback preview on `127.0.0.1` talks to `127.0.0.1:5000` instead of hardcoding `localhost:5000`.
  - Updated the Dashboard auth backend `refresh_token` endpoint to return a non-error “no active session” payload when the visitor is anonymous or the refresh cookie is invalid, which removes noisy console errors on public first-load while keeping the existing popup/refresh flow intact.
- Verification:
  - `npm run lint` passed in Grimoire.
  - `npm test` passed in Grimoire with added coverage for legacy storage migration and pending import retry behavior.
  - `npm run build` passed in Grimoire.
  - `npm run check` passed in `Dashboard/backend`.
  - Ran the required Playwright smoke client against `http://127.0.0.1:8787/` after starting a local preview server and a loopback auth stub. Visually reviewed `output/web-game-production-clean/shot-0.png`; the page rendered correctly and no browser-console error file was produced.
- Follow-up:
  - Full live login/sync testing against the real Continental ID service still requires the deployed auth backend, popup page, and a browser that permits the cross-site refresh cookie.

2026-03-20
- Rendering stabilization pass for rapid page flashing:
  - Traced the issue to compositor-heavy styling rather than React state: the app was stacking translucent panels, `backdrop-blur`, large blurred glow elements, and a fixed masked full-page overlay.
  - Replaced the global masked `body::before` overlay with a static body background so the page no longer depends on a fixed masked layer.
  - Removed every `backdrop-blur*` and `blur-3xl` usage under `src/`, and increased surface opacity across the play shell, play table HUD/hand tray, deckbuilder header/panels, account banner, branding card, tab switcher, and modal backdrops.
  - Kept the overall dark visual direction, but converted the previous glass effects into stable painted gradients so Safari/WebKit-style compositor flicker has far fewer triggers.
- Verification:
  - `npm run build` passed after the stabilization changes.
  - Confirmed by source search that no `backdrop-blur`, `blur-3xl`, `mask-image`, or `body::before` usage remains anywhere under `src/`.
  - Ran the required `develop-web-game` smoke client against `http://127.0.0.1:8787/play`.
  - Captured fresh local screenshots for `/play` and `/play/create` in `tmp-debug/play-home.png` and `tmp-debug/play-create.png` and visually reviewed them.
- Search-loop fix:
  - Confirmed an actual render-triggered request loop in the deckbuilder search path: `App` was re-normalizing filters on every render and `useCardSearch` depended on the filter object by identity, so equal filter values could still retrigger the search effect continuously.
  - Switched `App` to pass the stable filter state directly and updated `useCardSearch` to key its effect off a serialized filter signature instead of raw object identity.
  - Verification:
    - `npm run build` passed.
    - `npm run lint` passed.
- Visual cleanup and polish pass:
  - Reworked the global background so the grid texture is softer and the page regains atmospheric depth without the heavy, glitch-prone glass look.
  - Upgraded the shared shell surfaces (`SiteNav`, `AppHeader`, `SectionPanel`, account banner, play hero frame, branding cards) from flat dark fills to layered gradients and subtle highlight rings, restoring hierarchy after the previous stabilization pass flattened too much of the UI.
  - Refined the deckbuilder workspace switcher into a proper control band and tuned the play pages so the hero area has a right-hand information rail instead of a large empty slab on simpler routes like create/join.
  - Updated the main play page cards and forms to match the new surface treatment so the shell and inner content no longer look like they belong to different visual systems.
  - Verification:
    - `npm run build` passed.
    - `npm run lint` passed.
    - Captured and visually reviewed fresh screenshots for desktop and mobile in `tmp-visual-audit/desktop-home-top.png`, `tmp-visual-audit/desktop-play-home.png`, `tmp-visual-audit/desktop-play-create.png`, `tmp-visual-audit/mobile-home-top.png`, and `tmp-visual-audit/mobile-play-create-top.png`.

2026-03-21
- Turn-and-board interaction pass:
  - Removed the old turn phase system from the shared protocol, server turn state, and client UI so the table now tracks only turn number plus the active player.
  - Added server-side turn ownership enforcement for all game actions; off-turn actions are rejected with a clear active-player message instead of mutating state.
  - Reworked the game HUD into a turn spotlight with a single pass-turn action, plus clearer “your turn” / “locked until X passes” messaging.
  - Enlarged each battlefield lane, added an in-lane board rail with visible library / graveyard / command / exile piles, and moved draw / shuffle / untap interactions onto that board rail.
  - Made the library pile draw directly from the board and styled it as a facedown stacked card pile with an upside-down card-back treatment.
  - Added graveyard access from the lane pile so clicking it opens the zone list in the sidebar for card selection and movement, instead of relying on external top-level buttons.
  - Locked major local interaction surfaces off-turn: hand dragging/casting, lane reposition/tap/stack actions, inspector mutations, token creation, stack actions, and player-marker edits now all respect the active turn.
  - Updated `scripts/validate-play-table.mjs` to match the new create-room label, board pile selectors, turn passing, and self-contained validation card images.
- Verification:
  - `npm test` passed.
  - `npm run lint` passed.
  - `npm run build` passed.
  - Ran `node scripts/validate-play-table.mjs http://127.0.0.1:8788` against a built preview server and refreshed `artifacts/playwright/revamp/alice-table.png`, `artifacts/playwright/revamp/bob-table.png`, and `artifacts/playwright/revamp/summary.json`.
  - Ran the required `develop-web-game` smoke client against `http://127.0.0.1:8788/play` and refreshed `output/web-game/shot-0.png`.
  - Visually reviewed the refreshed multiplayer screenshots plus the smoke screenshot. The board rail, turn spotlight, off-turn lock state, and local draw/graveyard piles all rendered as expected.
- Follow-up:
  - The generic smoke client still records one `403 (Forbidden)` console resource-load message in `output/web-game/errors-0.json`; the gameplay/table validations completed successfully and the message appears unrelated to the new turn/board changes.

2026-03-21
- Board overlay and table-cohesion pass:
  - Replaced the remaining below-board zone browser path with an absolute in-table `ZoneOverlay`, so clicking graveyard / command / exile piles now opens cards directly over the board instead of in the old lower utility section.
  - Removed the sidebar `Zones` tab and kept zone interaction on the board rail and overlay flow only.
  - Swapped the faux facedown library art for the real MTG card back from `public/Magic_card_back-removebg.png`, using it for stacked face-down pile rendering.
  - Opened up the table proportions: widened the board vs sidebar split, increased lane/playmat height, softened lane shells, and tuned the board rail/hand tray styling so both players read more like seats at one shared table instead of isolated panels.
  - Updated `scripts/validate-play-table.mjs` for the overlay workflow, including per-card move buttons inside the overlay, a final screenshot with the overlay visible, and explicit Playwright context teardown so the validator exits cleanly.
- Verification:
  - `npm run build` passed.
  - `npm run lint` passed.
  - `npm test` passed.
  - `node scripts/validate-play-table.mjs http://127.0.0.1:8788` passed and refreshed `artifacts/playwright/revamp/alice-table.png`, `artifacts/playwright/revamp/bob-table.png`, and `artifacts/playwright/revamp/summary.json`.
  - Ran the required `develop-web-game` smoke client against `http://127.0.0.1:8788/play` and refreshed `output/web-game/shot-0.png`.
- Follow-up:
  - The generic smoke client still records the same unrelated `403 (Forbidden)` resource-load console message in `output/web-game/errors-0.json`.

2026-03-21
- Hidden sandbox room pass:
  - Added a private `/play/lab` entry point that is not linked from the normal play nav.
2026-03-21
- Zone overlay interaction refinement:
  - Replaced the viewport-anchored per-card action tray with an in-card tray so move buttons stay centered under the selected card and remain visible when the pile wraps onto multiple rows.
  - Made zone cards read more like art-only cards by removing the extra mini-panel shell from the zone variant and using only a light selected glow plus card shadow.
  - Added click-to-toggle selection on overlay cards so tapping the same card again collapses its action tray.
  - Extended the same in-overlay move tray to the local library pile, so specific cards can be pulled straight from library view without going through the inspector.
  - Verification:
    - `npm run lint`
    - `npm run build`
    - Playwright browser checks against the live preview server for:
      - multi-row graveyard overlay with a selected first-row card and a second row beneath it
      - outside-click close after opening the overlay
      - local library overlay showing five move buttons after selecting a card
2026-03-21
- Zone overlay compactness pass:
  - Reworked the zone overlay into a viewport-fixed layer with capture-phase outside-click dismissal so clicks outside the card surface reliably close it.
  - Removed the in-flow selected-card action tray. The move buttons now float under the selected card as an anchored overlay, so selecting a card no longer stretches the pile frame or shifts nearby cards.
  - Tightened the overlay shell padding, reduced the card cluster spacing, and kept the faint zone-tinted backdrop plus empty-pile watermark.
  - Verification:
    - `npm run lint`
    - `npm run build`
    - Browser validation through a temporary Playwright flow that unlocked the hidden lab, started the debug game, moved a card to graveyard, opened the graveyard overlay, selected the card, and closed it by clicking outside.
  - Follow-up:
    - The browser runs still surface the known unrelated `403 (Forbidden)` resource warning, but the overlay behavior itself passed the visual check.
  - Added a server-side debug unlock flow with a password gate. The server accepts `PLAY_DEBUG_ROOM_SECRET` and falls back to `grimoire-lab` when that env var is unset.
  - Added a hidden debug room mode that is always private, never appears in the public room directory, and rejects joins from sessions that have not unlocked the debug password.
  - Added placeholder lobby seats that are marked explicitly in the room snapshot, carry synthetic decks, and can be added or removed from the room lobby without extra accounts.
  - Made debug rooms startable immediately by the host, with synthetic decks auto-filled if nobody has chosen a real deck yet.
  - Surfaced sandbox state in the client lobby and game HUD so the room is clearly labeled as a debug room once it opens.
- Verification:
  - `npm run build` passed.
  - `npm run lint` passed.
  - `npm test` passed with new coverage for debug room unlock/create/add/remove flows.
  - Ran a Playwright browser pass against `http://127.0.0.1:8787/play/lab`, unlocked the lab with `grimoire-lab`, opened the sandbox room, added an extra placeholder seat, and started a debug game.
  - Captured and reviewed screenshots in `artifacts/playwright/debug-lab/room-default.png`, `artifacts/playwright/debug-lab/room-with-extra-seat.png`, and `artifacts/playwright/debug-lab/game-sandbox.png`.
  - The browser pass only reported the same unrelated `403 (Forbidden)` resource-load console message seen in earlier smoke checks.

2026-03-21
- Full-art card rendering pass:
  - Switched all visible card renderers to contained art so no card image is cropped in the browser UI.
  - Updated the play-table zone rail, table-card surfaces, inspector preview, and both card-detail modals to use explicit card-ratio frames with full art visibility.
  - Kept the zone rail and overlay separate from the placement surface, but widened the rail and pile visuals so the cards no longer read as compressed.
  - Verification:
  - `npm run build` passed.

2026-03-21
- Zone overlay and turn-accessibility pass:
  - Tightened the graveyard / exile / command overlay cards into a compact wrapping layout so many more cards fit across the screen instead of a forced two-column grid.
  - Added a persistent floating turn dock at the bottom of the viewport so passing the turn is available without scrolling back to the table header.
  - Strengthened the active-turn treatment in the HUD with a green spotlight state, stronger badge treatment, and a page-level glow while the local player is active.
  - Added stable `data-testid` hooks for both pass-turn buttons and updated `scripts/validate-play-table.mjs` to click the floating dock explicitly.
- Verification:
  - `npm run build` passed.
  - `npm run lint` passed.
  - `node scripts/validate-play-table.mjs http://127.0.0.1:8787` passed after restarting the preview server so the rebuilt bundle was loaded.
  - Reviewed refreshed screenshots in `artifacts/playwright/revamp/alice-table.png` and `artifacts/playwright/revamp/bob-table.png`; the tighter zone cards and the floating turn dock are visible.
  - `npm run lint` passed.
  - Ran `node scripts/validate-play-table.mjs http://127.0.0.1:8787` and refreshed `artifacts/playwright/revamp/alice-table.png`, `artifacts/playwright/revamp/bob-table.png`, and `artifacts/playwright/revamp/summary.json`.
  - Ran the required `develop-web-game` smoke client against `http://127.0.0.1:8787/play` and captured `output/web-game/full-art-smoke/shot-0.png`.
  - Ran a direct Playwright pass on the deckbuilder and visually confirmed a real card detail modal in `output/web-game/card-detail-smoke/shot-0.png`.

2026-03-21
- Zone rail merge pass:
  - Reworked each battlefield lane into a single merged shell so the play field and zone rail read as one connected table surface instead of two separate panels.

2026-03-21
- Zone overlay art-only pass:
  - Simplified the graveyard / exile / command / library overlay cards so the tiles now show art only by default.
  - Moved the move actions behind card selection, so clicking a card reveals its zone buttons directly below the art instead of showing metadata on every tile.
  - Added a lightweight staggered fly-in animation so overlay cards appear to come out of the pile and settle into the existing wrap layout.
  - Updated the play-table validator to click the selected overlay card first, then use the revealed action tray.
  - Verification:
    - `npm run lint` passed.
    - `npm run build` passed.
    - Ran `node scripts/validate-play-table.mjs http://127.0.0.1:8787` against the local preview server and visually reviewed the refreshed screenshots in `artifacts/playwright/revamp/alice-table.png` and `artifacts/playwright/revamp/bob-table.png`.
    - The validator produced the expected screenshot artifacts but did not exit cleanly, so its lingering Node process was killed after the browser pass completed.

2026-03-21
- Zone overlay close/background pass:
  - Removed the last overlay chrome so the zone view now shows only the cards plus a faint, zone-tinted background.
  - Stopped the fly-in animation from rerunning on every card selection by only remounting the overlay when a zone is first opened.
  - Added top-aligned overlay layout and a fixed action tray so selecting a card no longer pushes the pile upward.
  - Added backdrop-click closing with a delayed close animation and kept Escape as a keyboard shortcut.
  - Added a subtle empty-pile watermark so an empty zone still reads as an overlay even without cards.
  - Verification:
    - `npm run lint` passed.
    - `npm run build` passed.
    - Ran a focused Playwright overlay check against the local preview server and visually reviewed `artifacts/playwright/revamp/overlay-graveyard-only.png` and `artifacts/playwright/revamp/overlay-after-close.png`.
    - Confirmed the overlay dismisses on outside click and the closed frame returns to the table.
  - Increased the rail column width and the pile art footprint so the zone cards feel wider rather than being visually shrunk inside a narrow sidebar.
  - Kept the rail non-dropable by leaving all placement handling on the play field pane only.
- Verification:
  - `npm run build` passed.
  - `npm run lint` passed.
  - Ran `node scripts/validate-play-table.mjs http://127.0.0.1:8787` and refreshed `artifacts/playwright/revamp/alice-table.png` and `artifacts/playwright/revamp/bob-table.png`.
  - Ran the required `develop-web-game` smoke client against `http://127.0.0.1:8787/play` and captured `output/web-game/rail-merged-smoke/shot-0.png`.

2026-03-23
- Opponent rail minimization pass:
  - Replaced the compact opponent zone rail with a number-only dock so non-local lanes no longer render mini pile cards at all.
  - Shrunk the reserved opponent rail column again so three-player and larger tables preserve noticeably more horizontal space for the battlefield.
  - Kept the local player's full rail unchanged, including pile visuals and controls.
  - Verification:
    - `npm run build` passed.
    - Ran a focused three-player browser validation against `http://127.0.0.1:8787` and visually reviewed `artifacts/playwright/revamp/three-player-rail-counts/alice-three-player.png`.
