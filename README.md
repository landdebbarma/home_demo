# The Cornerstone Architect — website & admin

Portfolio website for The Cornerstone Architect (Ar. Jeanne Joseph, Bengaluru), with a dedicated page for
**The Finishing Touch by Jeanne** and a private admin dashboard. Hosted on **Vercel**; **GitHub is the content
store** — there is no database.

Design direction and reference research: [`docs/DESIGN.md`](docs/DESIGN.md).

## How it works

```
Admin (/admin) ──► /api/admin (Vercel Function) ──► GitHub API ──► commit on main ──► Vercel builds & deploys
                                                                                        │
Public site ◄── static pages + images built from content/*.json and public/uploads ◄────┘
```

- **Content:** `content/projects.json` and `content/site-content.json`. Images live in `public/uploads/`
  (`projects/<slug>/` and `site/`) as WebP at up to four widths (480/960/1600/2400 px). Originals are not kept.
- **Public site:** React + Vite + Tailwind. Content is baked in at build time — only *published* projects are
  included, so drafts never reach the public site. Each route gets its own HTML with meta tags; `sitemap.xml`,
  `robots.txt` and `version.json` (the deployed commit) are generated at build.
- **Saving:** uploading an image only stores it on GitHub as an unattached blob. **Save** makes *one* commit with
  the JSON and every new image, and deletes image files nothing references any more. If the content changed on
  GitHub since the editor opened (another tab, another person, a manual edit), the save is refused, the edits
  stay in the editor, and *Load latest version* merges them field by field before saving again.
- **Publishing status:** each save shows *deploying → live / failed* in the admin sidebar. It only says
  *live* when the public site's `version.json` reports a build containing that commit. If a deploy fails, the
  site keeps serving the previous successful deployment.

## Setup

### 1. GitHub access (choose one)

**GitHub App (recommended)** — GitHub → Settings → Developer settings → GitHub Apps → New:
- Repository permissions: **Contents: Read and write**, **Deployments: Read-only**, **Commit statuses: Read-only**.
- No webhook needed. Create it, **generate a private key** (.pem), then **install** it on this repository only.
- You need: the **App ID**, the **Installation ID** (the number at the end of the installation's settings URL),
  and the **private key**. Don't use an installation *token* — those expire after an hour; the server mints
  fresh ones from the private key.

**Fine-grained personal access token** — limited to this repository, same permissions. Set `GITHUB_TOKEN`.

### 2. Environment variables

Set these in **Vercel → Project → Settings → Environment Variables** (Production). For local development put them
in `.env` (see [`.env.example`](.env.example)).

| Variable | |
|---|---|
| `ADMIN_EMAIL` | Admin sign-in email |
| `ADMIN_PASSWORD_HASH` | Run `npm run hash-password`, type the password, paste the printed value |
| `SESSION_SECRET` | 32+ random characters (command in `.env.example`) |
| `GITHUB_OWNER` + `GITHUB_REPO` | Repository owner and name (or `GITHUB_REPO` alone as `owner/name`) |
| `GITHUB_BRANCH` | `main` |
| `GITHUB_APP_ID`, `GITHUB_INSTALLATION_ID`, `GITHUB_PRIVATE_KEY` | GitHub App. Paste the whole .pem including the BEGIN/END lines; if the field won't take line breaks, write them as `\n`. (`GITHUB_APP_INSTALLATION_ID` / `GITHUB_APP_PRIVATE_KEY` also work.) |
| `GITHUB_TOKEN` | *Instead of the App*: fine-grained token |
| `COMMIT_AUTHOR_NAME`, `COMMIT_AUTHOR_EMAIL` | Author of content commits — use an email on a GitHub account that can deploy the Vercel project (Vercel can block deployments from unknown commit authors) |
| `SITE_URL` | Optional; set when using a custom domain |

Redeploy after changing environment variables.

### 3. Vercel project

The repo includes `vercel.json` (framework Vite, output `dist`, the admin API function, rewrites and cache headers).
With the GitHub integration connected, every commit to `main` — including the admin's content commits — deploys
to production automatically. Nothing else to configure.

**Recommended:** add a Vercel Firewall rate-limit rule for `/api/admin/login` (e.g. 10 requests / minute / IP).
The function also limits failed logins, but that counter lives in each serverless instance's memory, so the
firewall rule is what guarantees a global limit.

### Changing the admin password

Run `npm run hash-password`, update `ADMIN_PASSWORD_HASH` in Vercel, redeploy. Every existing session is signed out.

## Development

```bash
npm install
npm run dev          # site + admin API on http://localhost:5173 (uses .env; talks to the real GitHub repo)
npm run build        # production build into dist/
npm run lint
```

Content saved from a local admin is committed to GitHub like in production; `git pull` to see it locally.

## Admin (`/admin`)

| Section | |
|---|---|
| Dashboard | Counts of published / draft / unpublished projects, recent edits |
| Projects | Search, filter, publish, unpublish, delete (with confirmation) |
| Add New Project / editor | Details, cover image, gallery (multi-upload, drag-and-drop or arrows to reorder, captions, alt text, replace, delete), featured on homepage, display order, **Preview**, Save draft / Publish / Unpublish |
| Website Content | Contact details, homepage, About page, The Finishing Touch text and images |

Images: JPEG, PNG or WebP. Large photos are resized in the browser (max 2400 px) before upload, then validated
and converted to WebP on the server. The same picture uploaded twice is stored once. Text in `[square brackets]`
shows on the site as a visible "to be supplied" placeholder.

Unsaved edits are kept in the browser and offered for restore after a reload or failed save.

## Contact form

There is no server-side inbox (no database by design): the form validates the enquiry and opens the visitor's
email app with the message addressed to the studio's email. To receive enquiries directly instead, add an email
service (e.g. Resend) behind a small Vercel Function.

## Tests

```bash
npm run test:e2e   # API workflow against an in-memory GitHub (incl. App auth, conflicts, cleanup, public build)
npm run test:ui    # the same workflow through the real admin UI in headless Chrome
```

`test:ui` needs a local Chrome; set `CHROME_PATH` if it isn't at the default Windows location.

## Content still needed from the studio

- Project photography and details (the three Sample Projects are placeholders — edit or delete them).
- A portrait of Ar. Jeanne Joseph, her personal introduction and professional background (About page).
