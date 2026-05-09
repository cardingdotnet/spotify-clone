# 🎵 Spotify Clone with SoundCloud — Stream Anywhere

A Spotify-like music streaming app where each user gets a personal `.m3u` URL that plays their playlist in any media player (browsers, VLC, IMVU, car stereos).

## ✨ Features

- 🔐 User authentication (signup/login with username + password)
- 🎵 Search SoundCloud's massive music library
- 📝 Create and manage playlists
- 🔗 **Per-user streaming URL** — each user gets `https://yoursite.com/stream/{token}.m3u`
- 🎧 Stream URLs work in: VLC, browsers, IMVU, web radios, car stereos, etc.
- 🎨 Spotify-inspired clean UI
- 🌐 Bilingual support (English/Arabic)

## 🏗️ Architecture

```
Frontend (Next.js 14) → Vercel
Backend (API Routes)  → Vercel Serverless Functions
Database + Auth       → Supabase (free tier)
Music Source          → SoundCloud API
```

## 📂 Project Structure

```
spotify-clone/
├── app/                          # Next.js 14 App Router
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── (main)/
│   │   ├── layout.tsx           # Sidebar + player layout
│   │   ├── page.tsx             # Home/Browse
│   │   ├── search/page.tsx
│   │   ├── library/page.tsx
│   │   └── playlist/[id]/page.tsx
│   ├── api/
│   │   ├── auth/
│   │   ├── search/route.ts
│   │   ├── playlists/
│   │   └── stream/
│   │       └── [token]/route.ts # m3u generator
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── player/
│   │   ├── AudioPlayer.tsx
│   │   ├── PlayerControls.tsx
│   │   └── ProgressBar.tsx
│   ├── playlist/
│   │   ├── PlaylistCard.tsx
│   │   ├── TrackList.tsx
│   │   └── ShareModal.tsx
│   ├── ui/
│   └── layout/
│       ├── Sidebar.tsx
│       └── TopBar.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── middleware.ts
│   ├── soundcloud/
│   │   ├── client.ts
│   │   └── types.ts
│   └── utils/
├── database/
│   └── schema.sql
├── public/
├── .env.local.example
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

## 🚀 Setup

1. **Create accounts (all free):**
   - [Vercel](https://vercel.com)
   - [Supabase](https://supabase.com) — create new project
   - [SoundCloud Developers](https://developers.soundcloud.com) — register app

2. **Clone and install:**
   ```bash
   git clone <your-repo>
   cd spotify-clone
   npm install
   ```

3. **Setup environment variables (`.env.local`):**
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   SOUNDCLOUD_CLIENT_ID=your_soundcloud_client_id
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```

4. **Run database migrations:**
   - Copy `database/schema.sql` content
   - Paste into Supabase SQL Editor
   - Run

5. **Start dev server:**
   ```bash
   npm run dev
   ```

6. **Deploy to Vercel:**
   ```bash
   vercel deploy
   ```

## 🔗 How the Streaming URL Works

When a user creates a playlist, they get a unique URL:
```
https://yoursite.com/stream/a1b2c3d4e5f6g7h8.m3u
```

When any media player opens this URL:
1. Backend looks up the playlist by token
2. Fetches fresh stream URLs from SoundCloud for each track
3. Returns a standard M3U playlist file
4. Player streams the tracks directly from SoundCloud

This means:
- ✅ Works in VLC, browsers, IMVU, car stereos, etc.
- ✅ No webpage opens — pure audio streaming
- ✅ Always fresh URLs (no expired links)
- ✅ Minimal bandwidth on your server (just metadata)

## 💰 Cost Breakdown

| Service | Free Tier | Cost After |
|---------|-----------|------------|
| Vercel | 100GB bandwidth | $20/month |
| Supabase | 500MB DB + 2GB bandwidth | $25/month |
| SoundCloud API | 15,000 req/day | Contact them |

**Total cost for ~1000 active users: $0** 🎉
