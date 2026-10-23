# Joint Venture Assets — Admin dashboard

The admin console for jointventureassets.com, split out of the Next.js site into its own Vite + React app.

```bash
npm install
npm run dev      # http://localhost:5175
```

Sign in with the demo admin: **admin@jointventureassets.com / admin123** (the login page can fill it in for you) to try the demo enquiries and messages, or with a JVA admin account on the server for everything else.

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

## Data

Listings (including drafts and closed deals), listing requests, members' requests and users come from
the JVA server's admin endpoints (`src/lib/api.ts`), so sign in with a JVA admin account to see them.

The server has no endpoints yet for enquiries or contact messages. Signed in with the demo login, those
two pages show demo data from `src/lib/demoApi.ts`, kept in `localStorage` so changes survive a reload;
**Reset demo** in the top bar restores it. Nothing is sent to the server while you use the demo login;
the other pages ask you to sign in with a JVA admin account instead.

## Settings

| Variable | Default | Used for |
|---|---|---|
| `VITE_WEBSITE_URL` | `http://localhost:3000` | "View website" and "View on website" links |
