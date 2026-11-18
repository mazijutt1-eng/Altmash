# Altamash Interiors — Website + Admin Dashboard

A static-looking website backed by a tiny zero-dependency Node server so you can log in and manage gallery images yourself.

## Run it

```bash
npm start
```

Then open:

- Website: **http://localhost:3000/**
- Dashboard: **http://localhost:3000/admin**

Default login: **admin / altamash2026**  
Change it from the dashboard → **Change Password**.

No `npm install` needed — the server uses only Node built-ins.

## Pages

| File | Purpose |
|---|---|
| `index.html` | Home (featured work is loaded from the dashboard data) |
| `gallery.html` | Gallery — filters + lightbox, loaded from the API |
| `services.html` | Services |
| `about.html` | About Us |
| `contact.html` | Contact, WhatsApp, map, enquiry form |
| `admin.html` | Login + image management dashboard |

## How image management works

- `data/gallery.json` stores every gallery item (title, label, category, image path, homepage flag).
- Uploaded photos are saved into `uploads/`.
- The dashboard can **add**, **edit**, **replace**, **delete** and **feature** images.
- The public gallery and homepage featured section fetch `/api/gallery`, so changes show up for all visitors after a refresh.
- `data/auth.json` stores the hashed login password.

To rebuild the initial gallery data from the original HTML, run:

```bash
npm run seed
```

> Note: `npm run seed` rewrites `data/gallery.json` from the legacy markup — only use it if you want to restore the original 29 demo images.

## Logo

The brand logo used in the website header, footer and admin dashboard is `logo.png` in the project root. It has a transparent background with dark text and gold accents so it blends into the bright/light theme. The untouched original is kept as `logo-original.png`. The small browser-tab icon is `assets/images/favicon.svg`.

## Hosting

Deploy to any host that can run Node.js (Render, Railway, VPS, etc.) and set the `PORT` environment variable if needed. Plain static-only hosting will not run the dashboard.

## Contact details

- **Address:** C6, 1st Floor, Greenland Housing Scheme, Lahore, Punjab, Pakistan
- **WhatsApp / Call:** +92 323 7331953 → `https://wa.me/923237331953`
- The enquiry form opens WhatsApp with prefilled details (no mail backend needed).

## Images

The original ceiling photos in `assets/images/` came from the Interior Company false-ceiling design page and are demo/reference visuals. Before going live commercially, replace them with your own project photos via the dashboard (or by keeping the same filenames in `assets/images/`).
