# Deployment

Two deliverables: the **admin console** → Vercel, and the **mobile app** → Google Play (via Expo EAS). The Supabase backend is already live and connected.

---

## Admin console → Vercel

The admin is `apps/admin` (Next.js 16) inside this pnpm + Turborepo monorepo.

### Option A — Git integration (recommended)
1. Push this repo to GitHub (or GitLab/Bitbucket).
2. Vercel dashboard → **Add New → Project** → import the repo.
3. **Root Directory:** `apps/admin` (Vercel then installs at the workspace root and builds the app).
4. Framework preset: **Next.js** (auto-detected). Build/install commands: leave default (Vercel detects pnpm).
5. **Environment Variables** (Production + Preview):
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://bvhlxkszcdxnsmvujiky.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = *(your anon key — public, RLS-protected)*
6. **Deploy.** Every push to the default branch redeploys.

### Option B — CLI (no Git host)
From the repo root, with a Vercel access token (`vercel.com/account/tokens`):
```
vercel link --cwd apps/admin --yes --token=$VERCEL_TOKEN
vercel env add NEXT_PUBLIC_SUPABASE_URL production   # paste value
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel deploy --prod --cwd apps/admin --token=$VERCEL_TOKEN
```

### After deploy
- Sign in with your admin account (`nayayaibrahim@gmail.com`).
- Add the Vercel domain to Supabase → Authentication → URL Configuration if you later enable email flows (not required for password login).

---

## Mobile app → Google Play (Expo EAS)

Config is ready: `apps/mobile/app.json` (package `com.althaqalayn.lectures`) + `apps/mobile/eas.json` (build/submit profiles; public Supabase env baked into the build).

### One-time
1. `eas login` (or set `EXPO_TOKEN` from expo.dev → Account → Access tokens).
2. From `apps/mobile`: `eas init` — creates the EAS project and writes its id into `app.json`.

### Build the release bundle
```
cd apps/mobile
eas build -p android --profile production
```
Produces an `.aab` in Expo's cloud (Android keystore is generated + managed by EAS).

### First submission (Play Console)
1. Play Console → **Create app** → "Althaqalayn Lectures", complete the store listing, content rating, data-safety, and privacy policy.
2. Create a **service account** (Play Console → Setup → API access → link a Google Cloud project → create service account with "Release manager"), download its JSON as `apps/mobile/play-service-account.json` (gitignored).
3. Submit:
```
eas submit -p android --profile production
```
   (Uploads to the **internal** track by default — change `track` in `eas.json` to `production` when ready for public release.)

### Updates
- Bump nothing manually — `autoIncrement` in `eas.json` handles `versionCode`. Rebuild + resubmit for store updates.
- For JS-only changes you can later add **EAS Update** (OTA) to push without a store review.

### Background audio note
`expo-audio` is configured with `enableBackgroundPlayback` + lock-screen support, so lectures keep playing when the app is backgrounded.
