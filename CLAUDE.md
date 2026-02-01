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

Web app with the goal of allowing people to track their net worth and increase it. The philosophy is you can't improve what you don't measure. So this app is meant to provide you an easy way to track your networth regardless of the asset or liability. Some features include:

- Track multiple accounts across different asset types
- Monitor your net worth progression with visual charts
- Analyze your income, expenditure and savings rate
- Project future wealth based on different scenarios
- Share your dashboard with trusted individuals
- Export your data for external analysis
- Track debt levels

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
