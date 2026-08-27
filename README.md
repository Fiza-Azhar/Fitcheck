# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Neon setup (required for auth & wardrobes)

Fitcheck uses Neon Postgres with a hand-rolled JWT auth layer (see
`lib/server/auth.ts`): each user signs in and sees only their own wardrobe,
enforced in application code rather than a DB-level policy. Do this once before
running the app.

1. **Env vars** — copy `.env.example` to `.env` and fill in:
   - `GROQ_API_KEY` (item analysis + outfits)
   - `DATABASE_URL` — Neon dashboard → Connect → Connection string → Show
     password. Server-only; never give it an `EXPO_PUBLIC_` prefix.
   - `JWT_SECRET` — any random string, e.g.
     `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
2. **Run the schema** — Neon dashboard → SQL Editor → paste `db/schema.sql` → Run.
   This creates `users`, `garments`, `wishlist_items`, and `shop_checks`, each
   scoped to a user by a plain `userId` column (no RLS — every `app/api/**+api.ts`
   route filters by the userId it decodes from the caller's JWT).
3. *(Optional)* start the background-removal sidecar for clean cutouts:
   `npm run bg-removal` (needs `BG_REMOVAL_URL` set).

### Auth demo runbook

1. `npx expo start` (or `npm run web`) — the Groq/bg-removal/auth routes are
   served by this dev server, so keep it running.
2. Create an account on the **Sign Up** screen → you land in the wardrobe.
3. Add an item (photo → Groq fills the details → Save). The photo is stored as
   base64 on the row and inserted scoped to your user id.
4. Sign out (top-right of the wardrobe) → sign in again → your items persist.
5. Sign in with the **same email** in another browser/device → the **same wardrobe**
   appears. A second account sees an entirely separate wardrobe.

This per-user foundation is what the browser extension logs into — see
`../portfolio-fitcheck-extension/docs/`.

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
