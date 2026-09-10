# Royal Barbershop — Website

Brgy. 1, Rizal, Siniloan, Laguna · Mon–Sun 9:00 AM – 8:00 PM

## What this is

A multi-page customer-facing site: live queue monitor home page, About,
Services, My Appointments, Contact, and a real account system (email or
Facebook login) — backed by Supabase (Postgres) with UUID primary keys.

## File structure

```
royal-barbershop-webapp/
├── index.html            Home — live queue monitor
├── about.html             About page
├── services.html          Services list
├── account.html           Log In / Sign Up (email + Facebook)
├── appointments.html      My Appointments (requires login)
├── contact.html           Contact page + message form
├── booking.html           Booking flow (requires login)
├── css/site.css            Shared design system
├── js/
│   ├── config.js            Supabase URL/key + shop hours
│   ├── site.js               Supabase client, auth helpers, navbar/footer
│   ├── account.js             Login/signup/Facebook logic
│   ├── home.js                Home page logic
│   ├── services.js            Services page logic
│   ├── appointments.js        My Appointments logic
│   ├── contact.js             Contact form logic
│   └── booking.js             Booking flow logic
├── manifest.json          Powers "Add to Home Screen"
├── icons/                 App icons
└── README.md              This file
```

## Accounts, not codes

Earlier versions of this app used a random "confirmation code" so guests
could look up bookings without an account. That's gone now — customers sign
up or log in (email/password or Facebook), and every booking is tied to
their real account via `user_id`, enforced by Row Level Security. A customer
can only ever see or cancel their own bookings; nobody can browse anyone
else's by guessing an id or code, because there's no anonymous access to
`queue_entries` at all anymore.

## UUID ids

`services.id` and `queue_entries.id` are UUIDs (`gen_random_uuid()`), not
sequential numbers — this was a deliberate move requested to make ids
non-guessable and to match common practice for anything tied to user data.

## Facebook Login setup (one-time, external)

Facebook login needs a Facebook Developer App created at
developers.facebook.com, with its App ID/Secret pasted into Supabase under
Authentication → Providers → Facebook, and the redirect URI
`https://<your-project>.supabase.co/auth/v1/callback` added to the Facebook
App's Valid OAuth Redirect URIs. Ask Claude for the full walkthrough if
needed.

## Hosting on GitHub Pages

Push this folder's contents to a repo (keep `index.html` at the repo root)
and turn on GitHub Pages in Settings → Pages.

## Known limits / next steps

- No Owner/admin dashboard yet (queue management, POS, reports).
- "Barber" isn't shown per-appointment — the shop currently has one barber.
- Facebook login requires the one-time external setup above before the
  button will actually work.
