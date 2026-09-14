# Leyoza Invoice Studio — Next.js

A separate React/Next.js version of the original invoice generator. The original HTML/CSS/JS project in the parent folder is unchanged.

## Run

Use Node.js 20.9 or newer (this project was tested with Node.js 24).

```powershell
cd nextjs-invoice
npm install
npm run dev
```

Open **http://localhost:3001**. Port 3001 lets this app run alongside the original version on port 3000.

Production:

```powershell
npm run build
npm start
```

## Saved JSON data

- `data/business.json`: business contact, bank name, account number, branch, and optional payment note.
- `data/draft.json`: the current invoice number/date, customer, items, delivery method/amount, and discount.

Draft changes save automatically after 500 ms. Business settings save only when you select **Save settings**. Cancel discards settings edits. The status indicator reports actual save results and offers retry on failure. Both files persist across browser and server restarts. There is one shared draft, not invoice history.

The files are server-side, outside `public/`. Back up this folder to keep your data. You can edit valid JSON while the app is stopped; reload the page after restarting. If a file is missing, the server recreates it using the sample defaults. Invalid/corrupt files produce a visible error and are never silently replaced.

`INVOICE_DATA_DIR` can point to a different writable directory for testing or deployment. Storage uses validated input, serialized writes, and temporary-file renames. This is intended for one local user and one Node.js process; simultaneous editors use last-write-wins. There is no authentication in this local version. The default scripts bind to localhost. For deployment, use a persistent writable disk; ephemeral/serverless hosting is not suitable for this JSON storage design.

## Features

- Responsive editor with section shortcuts, totals, and a mobile preview button.
- Native accessible modals for invoice preview and business settings.
- New invoice leaves the invoice number blank and focuses that field for manual entry. A number is required before downloading or printing; business information is read-only in the main form.
- Self-pickup clears the delivery charge. Delivery requires a positive amount.
- Up to 100 different products under one invoice number. Page breaks use the rendered row heights, including wrapped descriptions, and keep every item whole. The same invoice number and continuous item numbering appear across all pages; payment details and totals appear on the final page. Preview, PDF, and print share the same page breaks.
- Download captures the same React invoice component shown in the preview. Exported PDF text is rasterized, not selectable. Print uses the same component and supports selectable text; choose A4, 100% scale, no margins, and no browser headers/footers.
- All assets are local. The app requires its Next.js server, but no external CDN is used.

The initial sample data comes from the original reference PDF. The old app's browser-local drafts are not automatically transferred; the two projects are independent.

## Project structure

```text
app/                   Next.js pages, CSS, and JSON API routes
components/            React editor, invoice pages, modals, autosave hook
lib/invoice.js         Defaults, calculations, and validation
lib/store.js           JSON persistence
data/                  Business settings and saved draft
public/logo.png        Optimized original logo
tests/                 Calculation, validation, and persistence tests
```

Run tests with `npm test`. The API supports `GET` and `PUT` at `/api/business` and `/api/draft`.

Built with the [Next.js App Router](https://nextjs.org/docs/app/getting-started/installation) and [Route Handlers](https://nextjs.org/docs/app/getting-started/route-handlers), React, Bootstrap CSS, Bootstrap Icons, and custom CSS. PDF dependencies are loaded only when downloading.
