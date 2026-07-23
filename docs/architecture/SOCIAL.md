# Social Architecture

Vibe On integrates social features to foster community and collaborative music discovery.

## Core Features

### 1. User Profiles
Every user has a public profile displaying their taste profile (top genres/artists), public playlists, and recent activity. Profiles are managed via the `profiles` table in Supabase and synchronized via `SyncManager`.

### 2. Following & Activity Feed
Users can follow each other to stay updated on their musical journey.
- **Following Model**: Stored in the `follows` table.
- **Activity Feed**: A real-time stream of events (e.g., "User A favorited Track X", "User B created Playlist Y"). Events are published to the `activity` table.

### 3. Collaborative Playlists
Allows multiple users to build and manage a shared queue.
- **Real-time Sync**: Uses Supabase Realtime to broadcast operations (`ADD`, `REMOVE`, `REORDER`) to all active members.
- **Conflict Resolution**: Uses the operation-based sync model described in `SYNC.md`.

### 4. Group Sessions (Listening Parties)
Real-time playback synchronization across multiple devices.
- **Host/Guest Model**: One user acts as the host, controlling playback (play/pause/seek).
- **Sync**: Playback state is broadcasted via Supabase Realtime, and guests' `PlaybackManager` instances automatically stay in sync with the host.

## Security & Privacy
- **Privacy-by-Default**: Social activity is private until the user explicitly enables "Public Activity" in Settings.
- **RLS Policies**: Row Level Security ensures that only followers can see private activity and only members can edit collaborative playlists.
- **Blocking**: Users can block others, which prevents the blocked user from seeing the profile or activity of the blocker.

## State Management
Social state is centralized in the `socialSlice`. UI components use specialized hooks (e.g., `useProfile`, `useActivity`) to interact with social features, ensuring a clean separation between UI and business logic.
