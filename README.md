# Fitcheck

**Fitcheck is an AI-powered digital wardrobe for your phone.** Photograph your clothes, let AI catalogue them, get outfit suggestions for any occasion, and check whether something you're about to buy actually goes with what you already own.

Built with Expo / React Native (iOS, Android and web) and a serverless Postgres backend. It is the mobile companion to the Fitcheck browser extension, which checks products while you shop online.

## Features

- **Smart wardrobe** — snap a photo of a garment and a vision model fills in the details (type, colour, occasions). Review, edit and save.
- **Clean cutouts** — an optional background-removal service turns your photos into tidy product-style cutouts.
- **AI outfit suggestions** — pick an occasion and get complete outfits built from the clothes you already have, each with a short explanation of why it works.
- **Shop check** — a feed of products you looked at in the browser extension, plus a wishlist you can act on (e.g. move a wishlist item into your wardrobe). Repeat visits to the same product are collapsed into one entry.
- **Private accounts** — email sign-up and login. Every user sees only their own wardrobe, and the same account works across phone and extension.

## Tech stack

| Area | Tools |
| --- | --- |
| App | Expo SDK 54, React Native 0.81, React 19, Expo Router (file-based routing), TypeScript |
| API | Expo Router API routes (`app/api/**+api.ts`) |
| Database | [Neon](https://neon.tech) serverless Postgres (`@neondatabase/serverless`) |
| Auth | Custom JWT auth with `bcryptjs` password hashing (`lib/server/auth.ts`) |
| AI | [Groq](https://console.groq.com) — vision model for item analysis, LLM for outfit generation |
| Background removal | Python sidecar service (`services/bg-removal`), deployable with Docker |

## Project structure

```
app/            Screens and API routes
  (auth)/       Login and sign-up
  (tabs)/       Wardrobe, Add item, Outfits, Shop
  api/          Server routes: auth, garments, outfits, wishlist, shop-checks, analyze-item, remove-bg
components/     Reusable UI components
constants/      Design tokens and garment constants
db/schema.sql   Postgres schema (users, garments, wishlist_items, shop_checks)
lib/            Client data layer, AI helpers and server utilities
services/       Background-removal sidecar (Python)
```

## Getting started

### Prerequisites

- Node.js 18+ and npm
- A free [Neon](https://neon.tech) project
- A free [Groq](https://console.groq.com) API key
- *(Optional)* Python 3 for the background-removal sidecar

### 1. Install

```bash
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env` and fill in:

| Variable | Purpose |
| --- | --- |
| `GROQ_API_KEY` | Item analysis and outfit suggestions |
| `DATABASE_URL` | Neon connection string. Server-only; never prefix with `EXPO_PUBLIC_` |
| `JWT_SECRET` | Signs auth tokens. Generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `BG_REMOVAL_URL` | *(optional)* URL of the background-removal sidecar |
| `BG_REMOVAL_TOKEN` | *(optional)* Shared secret for a hosted sidecar |

### 3. Create the database tables

In the Neon dashboard open **SQL Editor**, paste the contents of `db/schema.sql` and run it. This creates `users`, `garments`, `wishlist_items` and `shop_checks`, each scoped to a user by a `userId` column. Access control is enforced in application code: every API route filters by the user id decoded from the caller's JWT.

### 4. Run the app

```bash
npm start        # dev server (native + web)
npm run web      # web only
npm run android  # Android build
npm run ios      # iOS build
```

Keep the dev server running: the auth, AI and background-removal routes are served by it.

### 5. *(Optional)* Background removal

```bash
npm run bg-removal
```

Set `BG_REMOVAL_URL` in `.env` to point at it. Without it the app still works; garments simply keep their original photo. See [`services/bg-removal/README.md`](services/bg-removal/README.md) for deploying it.

## Try it

1. Create an account on the **Sign Up** screen.
2. Add an item: take a photo, let AI fill in the details, then save.
3. Open **Outfits** and generate looks for an occasion.
4. Sign out and back in, or sign in on another device: your wardrobe is still there, and a second account sees a completely separate one.

## Scripts

| Command | Description |
| --- | --- |
| `npm start` | Start the dev server |
| `npm run web` | Start for web |
| `npm run android` / `npm run ios` | Run native builds |
| `npm run lint` | Lint with Expo's ESLint config |
| `npm run bg-removal` | Start the background-removal sidecar |

## License

Personal portfolio project. All rights reserved unless a license is added.
