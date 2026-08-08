# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

### What

I'm building a modern web app and want it built using server actions, as much possible using server components for quick load times and smooth user experience. Using chadcn for clean components and Postgres DB.

#### Tech Stack

- Next.js 15 (App Router with React Server Components)
- TypeScript
- Drizzle ORM with PostgreSQL (Supabase)
- Supabase Auth (Google OAuth)
- Tailwind CSS + Radix UI
- React Query (@tanstack/react-query)
- Components from chadcn
- /app folder is used in a standard way as any nextjs project
- Project is currently hosted on vercel

#### Project Structure

- All the components are in the /components folder
- db/schema.ts file contains the postgres db schema
- hooks file in /hooks
- lib file /lib contains various functions used

### Why

Web app with the goal of allowing people to track their net worth and increase it. The philosophy is you can't improve what you don't measure. The product deliberately does exactly two jobs, fed by one monthly ritual:

1. **Know your net worth** — every asset and liability, one balance per account per month, with the change decomposed into "what you saved" vs "what markets did".
2. **Keep a monthly budget** — income, categorised spending vs per-category targets, savings rate, reviewed monthly.

The **monthly check-in** (`/checkin`) is the spine: all balances prefilled from last month + income + uncategorised spending stragglers, ending on a reveal of what the month did to your net worth. Navigation is two tabs (Net Worth, Budget) plus the check-in button; accounts admin, sharing, FX rates (manual entry only — there is no rate auto-fetch), display currency and theme live in the avatar menu. Anything that doesn't serve the two jobs stays out of the product.

### How

#### Development Commands

```bash
# Development
npm run dev              # Start dev server with Turbopack (http://localhost:3000)
npm run build            # Production build
npm start                # Start production server
npm run lint             # Lint codebase

# Database Management
npm run db:generate              # Generate migrations from schema changes
npm run db:push                  # Push schema to database
npm run db:fix-migrations        # Fix migration tracking issues
npm run db:remove-migration      # Remove migration from tracking

```
