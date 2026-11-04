# Collaborative Playlists & Normalized Items Architecture 📋🤝

> **Document Status**: Production Architecture & Technical Specification
> **Sprint Scope**: Sprint 4.4
> **Target Module**: `src/features/library/librarySlice.ts`, `src/services/playlistCollaborationService.ts`, `src/pages/PlaylistPage.tsx`

---

## 1. Data Model & Normalization Strategy

To support multi-user concurrent curation without race conditions, playlist items are normalized into a dedicated table rather than modifying a single monolithic JSONB blob:

### 1.1 `public.playlist_items` Table Schema
- `id` (UUID, Primary Key): Stable item identifier (never index-based).
- `playlist_id` (UUID, Foreign Key to `playlists.id` ON DELETE CASCADE).
- `song_id` (TEXT, Not Null): Provider song identifier.
- `song_data` (JSONB, Not Null): Canonical song metadata (name, artist, album, duration, image).
- `position` (DOUBLE PRECISION, Not Null): Fractional ordering position.
- `added_by` (UUID, Foreign Key to `auth.users(id)`).
- `added_at` (TIMESTAMP WITH TIME ZONE DEFAULT NOW()).
- `updated_at` (TIMESTAMP WITH TIME ZONE DEFAULT NOW()).
- Stable Keying: `id UUID PRIMARY KEY` uniquely identifies each instance of a track, allowing playlists to legitimately support duplicate songs without collapsing them.

---

## 2. Fractional Ordering & Concurrency Control

### 2.1 Mid-Point Position Assignment
When an item is inserted between item $A$ (position $P_A$) and item $B$ (position $P_B$):
$$P_{\text{new}} = \frac{P_A + P_B}{2}$$
- **Initial Spacing**: Songs are initially seeded with positions incremented by `1000.0` (1000.0, 2000.0, 3000.0, ...).
- **Insert at Start**: $P_{\text{new}} = \frac{P_{\text{first}}}{2}$.
- **Insert at End**: $P_{\text{new}} = P_{\text{last}} + 1000.0$.
- **Tie-Breaking**: If two concurrent inserts produce identical floating-point positions, ordering is deterministically resolved by `added_at ASC, id ASC`.

### 2.2 Periodic Automatic Rebalancing
If repeated insertions reduce the fractional gap between items to $< 0.0001$, the database RPC `rebalance_playlist_positions(playlist_id)` re-spaces all tracks back to increments of `1000.0` in a single transaction.

---

## 3. Role-Based Access Control (RBAC)

| Capability | Owner | Editor | Viewer / Guest |
|---|---|---|---|
| **Rename / Delete Playlist** | Yes | No | No |
| **Invite / Remove Collaborators** | Yes | No | No |
| **Change Playlist Visibility** | Yes | No | No |
| **Add / Remove Songs** | Yes | Yes | No |
| **Reorder Songs** | Yes | Yes | No |
| **Play Songs / Save to Favorites**| Yes | Yes | Yes |

---

## 4. Migration & Backward Compatibility Strategy

The existing `playlists.songs_data JSONB` represents critical existing user data. We guarantee 100% backward compatibility:

1. **Dual Representation Support**:
   - Standard single-user playlists can continue reading/writing to `playlists.songs_data` without modification.
   - When a playlist is marked `is_collaborative = true`, the database helper `backfill_playlist_jsonb_to_items(playlist_id)` migrates all existing JSONB items into `playlist_items` with initial positions `1000.0, 2000.0, ...`.
   - The original `songs_data` JSONB is **not** deleted, preserving safety for rollbacks.
2. **Reconciliation on Save**:
   - When collaborative edits occur, a trigger or service keeps `playlists.updated_at` and `version` in sync.
3. **Guest Playlists**:
   - Guests manage local playlists stored in `localStorage` / `IndexedDB`.
   - Upon sign-in, local playlists can be migrated to private cloud playlists without duplicate entries.
