# Levlox Student Portal

React + Vite student portal running entirely on Firebase. There is no
application server: the browser talks directly to Firebase Authentication,
Cloud Firestore and Firebase Storage, with Firestore security rules as the
authorization boundary.

```
React / Vite  →  Firebase Authentication
              →  Cloud Firestore
              →  Firebase Storage

Vercel  →  frontend hosting
```

## Layout

| Path | Purpose |
| --- | --- |
| `frontend/` | The React application (the entire product) |
| `frontend/src/firebase.js` | The single Firebase app initialization |
| `frontend/src/services/firebaseService.js` | All Firestore + Storage operations |
| `frontend/src/services/authService.js` | Password / account operations |
| `firestore.rules` | Firestore authorization rules |
| `storage.rules` | Storage authorization rules |
| `firestore.indexes.json` | The five composite indexes the queries need |
| `backend/` | Admin-only CLI tooling. Not deployed, not called at runtime. |

## Local development

```bash
npm install --prefix frontend
```

Copy `frontend/.env.example` to `frontend/.env` and fill in the Firebase Web
config from the Firebase console, then:

```bash
npm run dev --prefix frontend
```

Production build:

```bash
npm run build --prefix frontend
```

## Firebase setup

The portal signs users in with **email and password**, so that provider must be
enabled once, in the console:

> Firebase console → Authentication → Sign-in method → Email/Password → Enable

Without it every sign-in fails with `auth/configuration-not-found`.

Deploy the rules and indexes:

```bash
firebase deploy --only firestore:rules,firestore:indexes,storage
```

## Creating the first administrator

Admin accounts are created by other admins, so the first one needs the Admin
SDK. From a trusted machine with the service-account JSON:

```bash
pip install -r backend/requirements.txt
```

```bash
FIREBASE_SERVICE_ACCOUNT=/path/to/service-account.json python backend/seed_admin.py --email admin@levlox.com --name "Super Admin" --password "<strong-password>"
```

This creates the Firebase Auth user and the matching `admins/{uid}` document
that the security rules check. The service-account file must never be committed
or shipped to the frontend.

## Migrating legacy data

Data written by the previous backend uses older collection and field names and
may still contain stored password hashes. `backend/migrate_legacy_data.py`
renames the collections, strips credentials, and re-keys student and admin
documents onto their Firebase Auth uid. It defaults to a dry run:

```bash
python backend/migrate_legacy_data.py
```

```bash
python backend/migrate_legacy_data.py --apply --create-missing-auth-users
```

It never deletes the source documents — verify in the console, then remove the
old copies by hand.

## Deploying to Vercel

Set the project root to `frontend/`. Vercel detects Vite automatically
(`npm run build`, output `dist`). Add each `VITE_FIREBASE_*` variable from
`.env.example` under Settings → Environment Variables, then redeploy —
Vite inlines them at build time, so changing a variable requires a new build.

`frontend/vercel.json` already rewrites all routes to `index.html` so client-side
routing works on refresh.

Add the deployed domain under Firebase console → Authentication → Settings →
Authorized domains.
