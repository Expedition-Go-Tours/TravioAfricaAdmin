# TravioAfrica Admin Dashboard

Admin dashboard for TravioAfrica — manage tours, users, suppliers, payouts, reviews, and analytics.

## Tech Stack

- **Framework:** React 19 + TypeScript
- **Bundler:** Vite 8
- **Routing:** React Router v6
- **Styling:** Tailwind CSS 3 + shadcn/ui
- **Animations:** Framer Motion
- **Charts:** Recharts
- **Data Fetching:** TanStack React Query
- **HTTP Client:** Axios
- **Auth:** Firebase Authentication
- **Backend:** Express.js + Prisma + PostgreSQL (Supabase) — hosted on Render.com

## Getting Started

### Prerequisites

- Node.js >= 20
- npm

### Installation

```bash
npm install
```

### Environment Variables

Create a `.env` file in the project root:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

### Development

```bash
npm run dev
```

Opens at `http://localhost:5173`.

### Build

```bash
npm run build
```

Output in `dist/`.

## Project Structure

```
src/
├── auth/              # Firebase auth hooks and route guards
├── components/
│   ├── layout/        # AppLayout, Sidebar, Header
│   ├── shared/        # DataTable, KPICard, StatusBadge, etc.
│   ├── skiper/        # AnimatedCard
│   └── ui/            # shadcn primitives (Button, Card, Dialog, etc.)
├── lib/               # Utils, axios instance, firebase config, animations
├── pages/
│   ├── finance/       # Payouts, Payout Methods
│   ├── revenue/       # Revenue Trend, Search Analytics, Cart Abandonment
│   ├── reviews/       # Review Moderation
│   ├── suppliers/     # Applications, Active, Detail
│   ├── tours/         # Tour Performance
│   └── users/         # User Growth, CLV, Conversion Funnel
├── services/          # API services (notifications)
├── App.tsx            # Routes
└── main.tsx           # Entry point
```

## Features

- **Dashboard Overview** — 7 KPI cards with count-up animations, revenue comparison, booking status donut
- **Revenue Analytics** — Revenue trend, search analytics, cart abandonment with charts + DataTables
- **User Analytics** — User growth (bar chart), CLV (pie chart + table), conversion funnel
- **Tour Performance** — Tour listing with status breakdown
- **Supplier Management** — Applications, active suppliers, detail view with 6 tabs (Business, Operating, Representative, Documents, Payout, Compliance)
- **Payouts** — Overview, list with approve/release/fail actions, payout methods per supplier
- **Review Moderation** — Approve/flag reviews
- **Notifications** — Bell icon with unread badge, dropdown feed, mark-all-read
- **Animations** — Page transitions, staggered table rows, card hover lift, sidebar collapse/expand

## Deployment

1. Build: `npm run build`
2. Deploy the `dist/` folder to any static host (Vercel, Netlify, Render Static, Cloudflare Pages)
3. Set the environment variables on the host
4. Ensure the backend URL in `src/lib/axios.ts` points to the live backend

## Related

- **Backend:** https://github.com/Expedition-Go-Tours/Backendv2
- **Frontend Storefront:** https://travioafrica.com
