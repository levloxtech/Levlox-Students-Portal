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
| `frontend/src/services/phoneIdentity.js` | Mobile number → Firebase Auth identifier |
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

### Running against the Firebase Emulator Suite

The emulators let you develop and test the full login flow locally without
touching the live project, and without any Firebase console configuration.
Requires Java 21+ for the Firestore emulator (Java 17 works with the pinned
`firebase-tools@13.35.1` below).

```bash
npx firebase-tools@13.35.1 emulators:start --only auth,firestore --project levlox-student-portal
```

Seed demo accounts (this script refuses to run unless the emulator environment
variables are set, so it can never write to production):

```bash
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 python backend/seed_emulator.py
```

Point the frontend at the emulators by creating `frontend/.env.development.local`:

```
VITE_USE_FIREBASE_EMULATOR=true
```

Use `.env.development.local`, **not** `.env.local` — Vite loads `.env.local` in
every mode, including production builds, which would ship emulator config.

Demo credentials: student `9876543210` / `StudentPass1`,
admin `9000000001` / `AdminPass1`.

## Authentication: mobile number + password

Users sign in with a **mobile number and a password**. Firebase has no provider
that does this directly:

| Provider | Why it does not fit |
| --- | --- |
| Phone Authentication | SMS one-time codes only — no password concept at all |
| Email/Password | A real password provider, but keyed by an email-shaped identifier |

So the portal uses the **Email/Password provider** with an identifier derived
from the mobile number, computed locally and deterministically:

```
9876543210  ->  9876543210@phone.levlox.invalid
```

The password is handed straight to Firebase Authentication, which stores and
verifies it on Google's servers. This application never sees, stores or hashes
it, and **nothing about credentials is written to Firestore**. Security is
identical to email sign-in — knowing someone's mobile number is as useless
without their password as knowing their email address would be.

Because there is no lookup service, there is no endpoint an attacker could use
to discover which mobile numbers are registered. Firebase also enforces
uniqueness on the identifier, which makes mobile numbers unique for free.

The mapping lives in two places that **must stay in sync**:
`frontend/src/services/phoneIdentity.js` and `backend/phone_identity.py`.

`.invalid` is reserved by RFC 2606 and can never resolve, so these addresses are
guaranteed undeliverable. The trade-off is that Firebase's "send password reset
email" flow does not apply — resets are an administrator action, which is how
this portal already worked.

### One-time console setup

> Firebase console → Authentication → Sign-in method → **Email/Password** → Enable

This provider backs the mobile-number sign-in described above. Without it every
sign-in fails with `auth/configuration-not-found`.

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
FIREBASE_SERVICE_ACCOUNT=/path/to/service-account.json python backend/seed_admin.py --mobile 9876543210 --name "Super Admin" --password "<strong-password>"
```

This creates the Firebase Auth account and the matching `admins/{uid}` document
that the security rules check. The service-account file must never be committed
or shipped to the frontend.

## Resetting a password

Sign-in identifiers are not real mailboxes, and changing another user's password
requires the Admin SDK, so resets are done from a trusted machine:

```bash
FIREBASE_SERVICE_ACCOUNT=/path/to/service-account.json python backend/reset_password.py --mobile 9876543210 --password "<new-temp-password>"
```

The student is then required to choose their own password at next sign-in.

## Migrating legacy data

Data written by the previous backend uses older collection and field names and
may still contain stored password hashes. `backend/migrate_legacy_data.py`
renames the collections, strips credentials, and re-keys student and admin
documents onto the Firebase Auth uid for their mobile number. Records without a
usable `phone` value are reported and skipped, since the mobile number is the
sign-in identity. It defaults to a dry run:

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
