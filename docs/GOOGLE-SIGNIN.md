# Google sign-in ("Sove pwogrè w ak yon kont Google")

Optional. Every kid already has a recovery code (MANGO-4821) that brings their progress back on a new phone. Google is a
second way: after a kid has played on 3 different days, the home screen offers (at most once a week, closable)
**Sove pwogrè w ak yon kont Google**. A parent answers the parent question (7 × 6), picks a Google account, and that
Google account is linked to the kid's existing account — the kid keeps everything. On a new phone, **Mwen gen yon kòd →
Konekte ak Google** (parent question again) logs into the same account and restores the progress.

Until the client ID below is filled in, all Google buttons and the offer stay hidden.

## What is already done
- App: `@react-native-google-signin/google-signin` (native module → **needs a new APK**; the GitHub Action builds one by itself
  because the app's native fingerprint changed), code in `apps/mobile/src/lib/google.ts`, screens `app/account.tsx`,
  `app/recover.tsx`, offer card `src/ui/AccountCard.tsx`.
  Why this library and not `expo-auth-session`: Google no longer accepts the browser redirect (custom `konesans://` scheme)
  for Android OAuth clients, so a browser-based login can't return to the app; the native Google Sign-In SDK can.
- Server: Nakama checks Google's signature; our hooks (`server/nakama/src/account.ts`) also check that the token was made
  for **our** client ID (runtime env `GOOGLE_CLIENT_IDS`, from `server/deploy/keys.env`) and put the kid's game name back
  as display name (Nakama would otherwise copy the parent's real name from Google). No secret is needed anywhere.

## What the owner does (about 15 minutes)

### 1. Create the Google Cloud project
1. Open **https://console.cloud.google.com** and sign in with the Google account that should own Konesans.
2. Top bar → project picker → **New project** → name `Konesans` → **Create**. Make sure `Konesans` is selected in the top bar.

### 2. Consent screen (what parents see when they pick an account)
1. Left menu (☰) → **APIs & Services → OAuth consent screen** (it may be called **Google Auth Platform**). Click **Get started**.
2. **App information**: App name `Konesans`, User support email = your email → **Next**.
3. **Audience**: **External** → **Next**.
4. **Contact information**: your email → **Next** → tick the agreement → **Continue** → **Create**.
5. Left menu of that page → **Audience** → **Publish app** → **Confirm** (status becomes *In production*).
   We only ask for the basic sign-in (no Gmail, no Drive), so Google does not need to review the app. Without this step
   only the "test users" you list there could sign in.

### 3. Web client ID (the one the app and server use)
1. Left menu → **Clients** (or **Credentials → + Create credentials → OAuth client ID**) → **+ Create client**.
2. Application type: **Web application**. Name: `Konesans server`. Leave "Authorized JavaScript origins" and
   "Authorized redirect URIs" empty → **Create**.
3. Copy the **Client ID** (looks like `123456789012-abc…xyz.apps.googleusercontent.com`). No need to keep the client secret.

### 4. Android client ID (lets the Konesans APK talk to Google)
1. First get the **SHA-1** of the key EAS signs the app with:
   1. Open **https://expo.dev** and sign in → organization **tjeangardys-team** → project **konesans**.
   2. Left menu → **Credentials** (under *Project settings*) → **Android** → click the application identifier
      **`ht.konesans.app`**.
   3. Under **Android upload keystore** (the build credentials EAS uses), copy the **SHA-1 Fingerprint**
      (looks like `AB:CD:12:…`, 20 pairs).
2. Back in Google Cloud → **Clients** → **+ Create client** → Application type **Android**.
3. Name `Konesans Android`, Package name **`ht.konesans.app`**, SHA-1 certificate fingerprint = the value from expo.dev →
   **Create**. (Nothing to copy from this one; it only has to exist.)
4. Later, if the app goes on the Play Store: Play Console → the app → **Test and release → App integrity → App signing**
   → copy the **App signing key certificate SHA-1** and create a second Android client with it (same package name).

### 5. Send back
Send Claude (or paste yourself — see below) **the Web client ID from step 3**. That's all; it is not a secret.

## Where the ID goes (done by Claude / the developer)
1. `apps/mobile/src/lib/server-config.ts` → `googleWebClientId: '<web client id>'`
2. `server/deploy/keys.env` → `GOOGLE_CLIENT_IDS=<web client id>` (comma-separate several if ever needed)
3. Commit and push to `main`: the server picks up the new setting within ~2 minutes; the app ships a new APK (first time,
   because of the native module) or an over-the-air update (later changes).

## Checking it works
- On a phone with the new APK, after 3 play days the green card appears on home (or open Mwen → *Kòd pou rekipere pwogrè m*
  → **Sove ak Google**). After the parent question and picking an account, the screen says *Kont Google konekte*.
- On another phone: first screen → **Mwen gen yon kòd** → **Konekte ak Google** → same Google account → "Se ou?" → progress back.
- `DEVELOPER_ERROR` / sign-in closes at once: the Android client's package name or SHA-1 doesn't match the APK (step 4),
  or the Web client ID in the app is wrong.
- The server refuses with `google_not_configured`: `GOOGLE_CLIENT_IDS` is empty on the server; `google token not for this
  app`: the app and server have different client IDs.
- iOS (not shipped today): would also need an iOS client ID and the library's config plugin in `app.json`
  (`["@react-native-google-signin/google-signin", { "iosUrlScheme": "com.googleusercontent.apps.<…>" }]`). Android needs no plugin.

## Privacy
Only the Google account's id is stored with the kid's account (Nakama `google_id`); the app never shows the parent's name,
email or photo, and the server resets the display name to the kid's generated game name after linking. The sign-in is
behind the parent question and the app signs out of Google right after getting the token, so nothing stays signed in on a
shared family phone.
