# Scrum Project Management System

A modern project management system built with React and Supabase, designed for Scrum teams.

## Features

- **Authentication with Invite Code**: Register with invite code to become admin
- **Role-based Access**: Admin, Mod, and Member roles
- **Pending Account Approval**: New users require admin approval
- **Project Management**: Create and manage Scrum projects
- **Activity Logging**: Track team activities and changes
- **Field Locking**: Admin/Mod can lock specific fields from member editing

## Quick Start

### 1. Setup Supabase

1. Create a [Supabase](https://supabase.com) project
2. Go to SQL Editor and run the contents of `supabase-schema.sql`
3. Copy your project URL and anon key from Settings > API

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your Supabase credentials:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Install and Run

```bash
npm install
npm run dev
```

## Admin Registration

The default admin invite code is `ADMIN_SECRET_2024`. Change this in the `app_settings` table in Supabase:

```sql
UPDATE app_settings SET value = 'YOUR_SECRET_CODE' WHERE key = 'admin_invite_code';
```

## Deploy to GitHub Pages

1. Go to repository Settings > Secrets and add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

2. Go to Settings > Pages > Source: GitHub Actions

3. Push to `main` branch - auto deploys!

## Tech Stack

- React 18 + Vite
- Supabase (Auth, Database, RLS)
- React Router (HashRouter for GitHub Pages)
