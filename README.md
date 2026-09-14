# Transcript Portal

A simple, self-hosted tool to generate student transcripts without editing a Word file by hand every time.

- Headings/layout stay fixed — you only fill in the fields.
- Two variants, matching your two sample formats:
  - **Assessment** — Attendance / Participation / Assignment / Overall Grade
  - **Marks** — Total Marks / Pass Marks / Marks Gained / Grade
- Add as many result rows as you need (e.g. multiple courses/topics).
- One click export to **.docx** (Word) or **.pdf**.
- No database, no accounts, no external services — pure Node.js, so it runs free on Render.

## Run it locally

```bash
npm install
npm start
```

Then open http://localhost:3000 in your browser.

## Deploy to Render (free)

1. Push this folder to a GitHub repository (create a new repo, e.g. `transcript-portal`, and push these files).
2. Go to https://dashboard.render.com → **New** → **Web Service**.
3. Connect your GitHub repo.
4. Configure:
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free
5. Click **Create Web Service**. Render will build and deploy automatically.
6. Once live, you'll get a URL like `https://transcript-portal.onrender.com` — bookmark it and use it any time you need a new transcript.

Note: Render's free tier spins the service down after periods of inactivity, so the first request after idling may take ~30-50 seconds to wake up. Every request after that is fast.

## How it works

- `server.js` — a tiny Express server with two routes: `/api/generate/docx` and `/api/generate/pdf`.
- `generators/docxGenerator.js` — builds the .docx using the `docx` npm library, replicating the exact table layout from your original templates.
- `generators/pdfGenerator.js` — builds the .pdf directly with `pdfkit` (pure JavaScript, no LibreOffice/Chromium needed, which keeps it lightweight enough for Render's free tier).
- `public/` — the form UI (plain HTML/CSS/JS, no build step, no framework).

## Customizing further

- To change fonts/colors/spacing in the Word file, edit `generators/docxGenerator.js`.
- To change the PDF layout, edit `generators/pdfGenerator.js` (column widths are defined as arrays near the top of each table section — they must sum to `USABLE_WIDTH`, currently 512pt).
- To add more fields to a variant (e.g. a "Remarks" column), add it to `FIELD_DEFS` in `public/app.js` and to the matching table builder in both generator files.
