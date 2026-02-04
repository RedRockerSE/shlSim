# SHL Standings Lab

Simulate SHL standings with deterministic outcomes and Monte Carlo simulations. Supports manual input, CSV import/export, and cloud persistence with Supabase.

## Quick start
1. Install dependencies:
```bash
npm install
```
2. Add Supabase env vars (see `.env.example`).
3. Run locally:
```bash
npm run dev
```

## Supabase setup
1. Create a Supabase project.
2. In Supabase SQL Editor, run the schema in `supabase/schema.sql`.
3. In Auth settings:
   - Enable email magic links.
   - Add your local dev URL and GitHub Pages URL to the redirect allowlist.

## Environment variables
Create a `.env` file locally (not committed) with:
```
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

For GitHub Pages, set these as build-time env vars in your deployment workflow.

## GitHub Pages deployment
- The workflow in `.github/workflows/deploy.yml` builds and publishes `dist` on every push to `main`.
- Add repository secrets:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- Make sure your Supabase Auth redirect URLs include your GitHub Pages site.

## Cloud save and sharing
- Sign in with your email to create your personal table.
- Click "Save to cloud" to persist changes.
- Click "Create share link" to generate a public read-only URL.
- Anyone with `?share=slug` can view the table read-only.

## CSV formats
Teams CSV columns:
```
name,gp,pts,rw,row,gf,ga
```

Games CSV columns:
```
home,away,outcome,probHome
```

## Notes
- Public read-only access is implemented via a Supabase RPC (`get_table_by_slug`).
- Only the owner can edit or save.
