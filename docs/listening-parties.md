# Public Listening Parties & Discovery Architecture 📻🎉

> **Document Status**: Production Architecture & Technical Specification
> **Sprint Scope**: Sprint 4.2
> **Target Module**: `src/services/partyService.ts`, `src/components/modals/SessionModal.tsx`, `src/features/session/sessionSlice.ts`

---

## 1. Overview & Party Lifecycle

A **Listening Party** is an open or semi-open synchronized room with discovery metadata, live participant counters, ephemeral room chat, WebRTC voice call support, and server-side moderation.

### Party Lifecycle States
1. **Scheduled**: Created in advance with an optional `scheduled_start` timestamp.
2. **Active**: Host is present, music is streaming, and listeners can discover and join.
3. **Paused**: Host temporarily paused playback or disconnected during the 30-second grace window.
4. **Ended**: Host explicitly terminated the party or all listeners left.
5. **Cancelled / Expired**: Scheduled start expired without host arrival or room remained empty > 15 minutes.

---

## 2. Discovery Categories & Deterministic Ranking

Rather than fabricating popularity counts, party discovery uses genuine signals computed from active participants and session timestamps:

| Category | Filter / Sorting Query | Real-time Update Trigger |
|---|---|---|
| **Active Now** | `status = 'active' AND participant_count > 0 ORDER BY updated_at DESC` | Lobby broadcast (`party_update`) |
| **Trending Parties** | `status = 'active' ORDER BY participant_count DESC, updated_at DESC LIMIT 10` | 15s aggregate heartbeat |
| **Starting Soon** | `status = 'scheduled' AND scheduled_start > NOW() ORDER BY scheduled_start ASC` | Database query on mount |
| **Friends Hosting** | Active parties where `host_id` is an accepted friend in `public.friendships` | Client filter matching friend IDs |
| **Genre / Category** | `status = 'active' AND category = :selectedCategory` | Tab filter |

---

## 3. Server-Enforced Moderation & Security

Client-side UI suppression is insufficient for user safety. Moderation is enforced at the database and channel layers:

1. **Kick / Remove Participant**:
   - Host or moderator calls `remove_room_participant(room_id, target_user_id)`.
   - The target user's record in `room_participants` is deleted, and a targeted broadcast signal `kicked` forces client departure.
   - Re-joining attempts fail RLS policy checks if blocked.
2. **Party Mute Controls**:
   - Host can set `settings.mute_chat = true`.
   - RLS policy or broadcast handler discards incoming messages from non-moderators.
3. **Abuse Reporting (`party_reports`)**:
   - Any authenticated participant can submit a report citing spam, inappropriate audio, harassment, or copyright violation.
   - Reports persist in `party_reports` with reporter identity, timestamp, and metadata for review.
4. **Rate Limiting & Spam Protection**:
   - Chat dispatches are limited to 1 message per 500ms per participant in client Redux and channel handlers.
