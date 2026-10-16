# Joint Venture Assets — Admin dashboard

The admin console for jointventureassets.com, split out of the Next.js site into its own Vite + React app.

```bash
npm install
npm run dev      # http://localhost:5175
```

Sign in with the demo admin: **admin@jointventureassets.com / admin123** (the login page can fill it in for you).

## Pages

| Route | What it does |
|---|---|
| `/` | Overview — review queue, request outcomes, top listings, newest members |
| `/requests` | Member requests, filtered by status and type; open one to accept or reject with a note |
| `/listings` | Live listings, filtered by **Joint venture / For sale** and status; create, edit, feature or delete |
| `/listings/new` | Owner defaults to Joint Venture Assets (or enter another owner); upload photos; **Save as draft** or **Publish** |
| `/drafts` | Unfinished listings, with what's still missing before they can be published |
| `/users` | Members by role; verify, suspend or reactivate |
| `/enquiries` | Enquiries from each property's page, filterable by property and status |
| `/messages` | Contact-form inbox |
| `/templates` | NDA, Letter of Intent and Facilitation Letter — fill in the details, download as Word or save as PDF |

Templates live in `src/data/templates.ts`; add an entry there to add a new document. They are starting
drafts — have a lawyer review them before first use.

## Demo data

There is no backend connected. `src/lib/mockApi.ts` stands in for it: every call waits 300–700 ms like a
network request, then reads or writes a small database in `localStorage` (seeded from `src/data/`), so
changes survive a reload. Uploaded photos are resized and stored the same way (the browser allows about
5 MB). **Reset demo data** in the sidebar restores the seed.

To connect the real API later, replace the functions in `src/lib/mockApi.ts` with HTTP calls of the same
shape — the pages and hooks don't need to change.

## Settings

| Variable | Default | Used for |
|---|---|---|
| `VITE_WEBSITE_URL` | `http://localhost:3000` | "View website" and "View on website" links |
