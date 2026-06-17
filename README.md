# Family Rummy 🃏

A premium, highly-responsive, real-time multiplayer Rummy card game designed for family and friends. Built as a monorepo workspace containing a React PWA frontend and a shared TypeScript game engine.

---

## 🚀 Key Features

* **Real-time Multiplayer**: Powered by Supabase Realtime Channels for low-latency player state syncing, turn logic, and live chats.
* **Fully Responsive PWA Layout**: Works on mobile viewports (both portrait and landscape modes) with zero-scrolling constraints and inline card dashboard actions.
* **Natural Card Reordering**: Interactive card reordering with smooth spring animations using Framer Motion.
* **Smart Stacking & Scale Index**: Card numbers and suit symbols automatically resize and scale horizontally to prevent overlaps and fit perfectly on compact viewports.
* **Stand-alone App Installation**: Progressive Web App (PWA) config enabling standalone installation directly on Android, iOS Safari, or desktop browsers with zero address bar overlays.

---

## 🛠️ Technology Stack

* **Monorepo Workspaces**: Managed via `pnpm` workspaces.
* **Frontend (`apps/web`)**: 
  - React + Vite + TypeScript.
  - Tailwind CSS v4 for the styling system.
  - `@vite-plugin-pwa` for service worker caching and installability.
  - Framer Motion for cards animations.
* **Game Engine (`packages/shared`)**:
  - Pure TypeScript deck, hand validation, London Rummy optimal grouping, and cumulative scoring logic.
  - Validated by unit tests via Vitest.
* **Backend Database (`supabase/`)**:
  - PostgreSQL schema, functions, RLS policies, and migrations.

---

## 📁 Repository Structure

```text
rummy/
├── apps/
│   └── web/                 # React frontend (Vite configuration, PWA config, page layouts)
├── packages/
│   └── shared/              # Game engine (validation rules, deck shuffling,London grouping)
├── supabase/
│   └── migrations/          # PostgreSQL database schemas, triggers, and function scripts
├── package.json
├── pnpm-workspace.yaml
└── README.md
```

---

## ⚙️ Getting Started

### Prerequisites

* Node.js (v18 or higher)
* [pnpm](https://pnpm.io/) package manager
* A [Supabase](https://supabase.com/) project

### Setup Instructions

1. **Install Dependencies**:
   ```bash
   pnpm install
   ```

2. **Configure Environment Variables**:
   Create a `.env.local` or `.env` file inside `apps/web/` with your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

3. **Database Migration**:
   Apply migrations to your Supabase PostgreSQL instance:
   - Copy and execute the SQL migration scripts located in `supabase/migrations/` inside your Supabase SQL Editor, or use the Supabase CLI:
     ```bash
     supabase db push
     ```

4. **Run Development Server**:
   Start the dev server for both web app and workspaces concurrently:
   ```bash
   pnpm dev
   ```

5. **Build for Production**:
   Build package types and bundle Vite assets:
   ```bash
   pnpm build
   ```
