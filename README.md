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
