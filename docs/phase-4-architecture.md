# Phase 4 Architecture Specification: Social Music Experiences & Differentiation 🎧🌐

> **Document Status**: Production Architecture & Technical Specification
> **Target Release**: Vibe On v1.0.3 (Capacitor Android & Web PWA)
> **Authors**: Product Engineering & Architecture Core
> **Dependencies**: Phase 1 (Resilience), Phase 2 (Social Schema & WebRTC), Phase 3 (Dual Audio Engine & History)

---

## 1. Executive Architecture Summary

**Phase 4** transforms Vibe On from an individual music streaming application into an interconnected, social, collaborative listening platform. The four core pillars comprise:
1. **Synchronized Group Listening (Sprint 4.1)**: Low-overhead, host-authoritative sub-second playback synchronization with tiered drift correction (0.98x–1.02x rate micro-adjustments and controlled seeks).
2. **Public & Private Listening Parties (Sprint 4.2)**: Real-time discovered rooms, rich metadata broadcasts, live ephemeral chat, and server-enforced moderation.
3. **Community Music Discovery (Sprint 4.3)**: A dedicated `/community` feed enabling sharing, discussions, reviews, and polls without fake activity.
4. **Collaborative Playlists (Sprint 4.4)**: Normalized `playlist_items` with fractional ordering, optimistic concurrency, and role-based access control.

```
+----------------------------------------------------------------------------------------------------+
|                                    VIBE ON CLIENT RUNTIME                                           |
|                                                                                                    |
|  +-------------------+    +--------------------+    +--------------------+    +-----------------+  |
|  | Group Listening   |    | Listening Parties  |    | Community Feed     |    | Collab Playlists|  |
|  | (useSession.ts)   |    | (partyService.ts)  |    | (/community route) |    | (librarySlice)  |  |
|  +---------+---------+    +---------+----------+    +---------+----------+    +--------+--------+  |
|            |                        |                         |                        |           |
|            v                        v                         v                        v           |
|  +-----------------------------------------------------------------------------------------------+ |
|  |                               REDUX STATE & DUAL AUDIO ENGINE                                 | |
|  |             (musicPlayerSlice, dual audioRefA / audioRefB, Web Audio API, LRCLIB)             | |
|  +----------------------------------------------+------------------------------------------------+ |
+-------------------------------------------------|--------------------------------------------------+
                                                  |
                         +------------------------+------------------------+
                         |                                                 |
                         v                                                 v
    +-----------------------------------------+   +----------------------------------------------+
    |           SUPABASE REALTIME             |   |            SUPABASE POSTGRESQL               |
    |  - room:<roomCode> (sync, chat, react)  |   |  - listening_rooms & room_participants       |
    |  - room:lobby (party discovery)         |   |  - parties & party_reports                   |
    |  - user:<userId> (direct & invites)     |   |  - community_posts, comments, reactions, flw |
    |  - playlist:<id> (collab mutations)     |   |  - playlists & normalized playlist_items     |
    +-----------------------------------------+   +----------------------------------------------+
```

---

## 2. Security & Authorization Architecture

1. **Row-Level Security (RLS)**:
   - Every table is protected with `ENABLE ROW LEVEL SECURITY`.
   - Access to private rooms and collaborative items requires cryptographic proof of identity (`auth.uid()`).
   - Moderation actions (kicking participants, muting chat, editing parties) are guarded by RLS policies verifying `host_id` or membership in `co_host_ids`.
2. **Guest vs. Authenticated User Boundary**:
   - Guest listeners retain local playback, local offline downloads, and read-only access to public parties and community feeds.
   - Any state-mutating operation (creating rooms, broadcasting host state, posting, reacting, following, editing collaborative playlists) requires an active authenticated Supabase session.
   - Unauthenticated write attempts trigger explicit, user-friendly sign-in modals without throwing unhandled exceptions.
3. **Fixed Search Path Security**:
   - All database RPC functions (`elect_next_room_host`, `rebalance_playlist_positions`, `backfill_playlist_jsonb_to_items`) specify `SET search_path = public, auth` to thwart search path hijacking vulnerabilities.

---

## 3. Data Flow & Communication Topology

| Feature | Primary Transport | Frequency | Persistence Target | Conflict Resolution |
|---|---|---|---|---|
| **Group Playback State** | Supabase Realtime Broadcast (`room:<code}>`) | On user action (play/pause/seek) + 5s heartbeat | Ephemeral (DB updated on song changes only) | Monotonic `state_version` + Host authority |
| **Room Chat & Reactions** | Supabase Realtime Broadcast (`chat`, `reaction`) | Immediate per user input | In-memory Redux buffer (capped at 100 msgs) | Client timestamp ordering |
| **Lobby Discovery** | Realtime Broadcast + PostgreSQL | 15s heartbeat + state transitions | `public.parties` table | Last-Write-Wins on `updated_at` |
| **Community Feed** | Supabase REST API + RLS | On-demand pagination (infinite scroll) | `public.community_posts` | Relational FK constraints + RLS |
| **Collaborative Edits** | Realtime Broadcast + REST RPC | Per item addition / reorder / removal | `public.playlist_items` | Fractional ordering + DB unique constraints |

---

## 4. Scalability & Failure Handling

1. **Minimizing Database I/O**:
   - Continuous audio progress is **never** written to PostgreSQL on every tick. Playback position is computed client-side using `authoritativePosition + (now - broadcastTimestamp) * speed`.
   - Only structural room events (song change, host election, closure) trigger database updates.
2. **Reconnection & Network Interruption**:
   - WebSockets automatically reconnect with exponential backoff.
   - A 30-second host grace period protects sessions against temporary mobile cellular drops or app switching.
   - When returning to an active room, client issues a targeted `requestSync` to receive the authoritative snapshot without interrupting other listeners.
