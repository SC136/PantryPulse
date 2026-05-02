# PantryPulse — Anti-Waste Kitchen Manager

AI-powered kitchen management. Track expiry dates, get recipe suggestions from your pantry, reduce food waste, and save money.

## Demo Video

<iframe src="https://drive.google.com/file/d/190ycbebRjjvjSZabUe_6Jvf5jZCkmhUr/preview" width="640" height="360" allow="autoplay"></iframe>

[Watch the demo video](https://drive.google.com/file/d/190ycbebRjjvjSZabUe_6Jvf5jZCkmhUr/view?usp=sharing)

## Features

- **🔴 Eat Me First Dashboard** — See what's expiring today, this week, and what's still fresh
- **📦 Smart Pantry Manager** — Track items across Fridge, Freezer, and Pantry with auto-expiry estimates
- **📸 Fridge Scan** — Take a photo of your fridge → AI detects all food items (Gemma-3-27B Vision)
- **🧾 Receipt Scanner** — Upload grocery receipts → OCR extracts items automatically (Tesseract.js)
- **👨‍🍳 AI Recipe Chat** — Ask "What can I cook?" → streaming recipes using ONLY your pantry items (DeepSeek V3.2)
- **🛒 Smart Grocery List** — Add, check off, and manage your shopping list
- **📊 Waste & Savings Stats** — Track money saved, items rescued, and waste reduction percentage
- **👤 Profile Preferences** — Dietary restrictions, cuisine preferences, cooking skill, appliances
- **🌗 Dark Mode** — Beautiful warm parchment aesthetic in both light and dark themes
- **🔐 Secure Auth** — Email/password + magic link via Supabase Auth with RLS

## Tech Stack

- **Framework:** Next.js 16 (App Router, TypeScript)
- **Styling:** Tailwind CSS v4 + Custom CSS Variables (Fine Art × Editorial aesthetic)
- **UI Components:** shadcn/ui
- **State:** Zustand
- **Backend/Database:** Supabase (PostgreSQL + Auth + Storage)
- **AI (Text/Chat):** DeepSeek V3.2 via NVIDIA NIM API
- **AI (Vision):** Gemma-3-27B-IT via NVIDIA NIM API
- **OCR:** Tesseract.js
- **Animations:** Motion (Framer Motion)
- **Icons:** Lucide React

## Prerequisites

- Node.js 18+
- A Supabase account (free tier works): https://supabase.com
- An NVIDIA NIM API key (free tier): https://build.nvidia.com

## 1. Supabase Setup

1. Create a new project at https://supabase.com/dashboard
2. Go to **Project Settings → API** → copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Go to **SQL Editor** → paste and run the contents of `src/lib/supabase/schema.sql`
4. Go to **Authentication → Email** → enable "Confirm email" (optional for dev: disable to skip confirmation)

## 2. Environment Setup

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```env
NVIDIA_API_KEY=        # From https://build.nvidia.com → API Keys
NEXT_PUBLIC_SUPABASE_URL=   # From Supabase dashboard → Settings → API
NEXT_PUBLIC_SUPABASE_ANON_KEY=  # From Supabase dashboard → Settings → API
```

## 3. Install & Run

```bash
npm install
npm run dev
```

Open http://localhost:3000

## 4. One-time Storage Setup

After the app starts, run once:

```bash
curl http://localhost:3000/api/setup-storage
```

This creates three storage buckets:
- `fridge-scans` (private) — uploaded fridge photos
- `receipt-scans` (private) — uploaded receipt photos
- `item-photos` (public) — item thumbnail photos

## Production Build

```bash
npm run build
npm start
```

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── page.tsx           # Dashboard — "Eat Me First"
│   ├── pantry/            # Full inventory manager
│   ├── cook/              # AI recipe chat
│   ├── grocery/           # Smart grocery list
│   ├── stats/             # Waste & savings tracker
│   ├── profile/           # User preferences
│   ├── auth/              # Login, signup, confirm, error
│   └── api/               # API routes
├── components/            # React components
│   ├── layout/            # Navbar, AuthProvider, ThemeToggle
│   └── ui/                # shadcn/ui components
├── lib/                   # Utilities
│   ├── supabase/          # Client, server, storage, schema
│   ├── ai/                # DeepSeek, Gemma Vision
│   ├── ocr/               # Receipt parser
│   └── utils/             # Expiry, formatting helpers
├── store/                 # Zustand state management
├── types/                 # TypeScript types
└── middleware.ts           # Auth session refresh + route protection
```

## Troubleshooting

- **Auth not working:** Verify `SUPABASE_URL` and `ANON_KEY` in `.env.local`, check `middleware.ts` is present
- **Storage upload fails:** Run `/api/setup-storage` again, check bucket RLS policies in Supabase dashboard
- **AI features not working:** Verify `NVIDIA_API_KEY` has credits at build.nvidia.com
- **RLS errors:** Ensure `schema.sql` was run completely including all `CREATE POLICY` statements
- **Middleware deprecation warning:** Next.js 16 shows a warning about middleware being deprecated in favor of "proxy" — the app still works correctly with middleware

## License

MIT
