# TimeTracker

A clean time tracking app for remote workers. Break your day into tasks, track time, and generate EOD summaries.

## Setup

### 1. Supabase

1. Go to [supabase.com](https://supabase.com) and open your project
2. Open **SQL Editor** and run the contents of `supabase-schema.sql`
3. Go to **Authentication > Providers** and make sure **Email** is enabled with "Enable Magic Link" turned on
4. Go to **Authentication > URL Configuration** and add your site URL to **Redirect URLs** (e.g. `http://localhost:5173/interior-design/` for local dev, and your GitHub Pages URL for production)

### 2. Environment

Create a `.env` file in the root:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Run locally

```bash
npm install
npm run dev
```

### 4. Deploy

For GitHub Pages, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as repository secrets. Push to `main` and the Actions workflow handles the rest.

## Keyboard Shortcuts

- **N** — Jump to Today and focus the quick-add input
- **E** — Open EOD summary
