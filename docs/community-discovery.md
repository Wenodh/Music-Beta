# Community Music Discovery & Feed Architecture 💬🎵

> **Document Status**: Production Architecture & Technical Specification
> **Sprint Scope**: Sprint 4.3
> **Target Module**: `src/pages/Community.tsx`, `src/features/social/communitySlice.ts`, `src/services/communityService.ts`

---

## 1. Overview & Dedicated `/community` Route

Community discovery is a first-class feature in Vibe On. It lives on a dedicated route:
- **Route**: `/community`
- **Entry Points**:
  1. Explore page header shortcut button.
  2. Friends Modal quick link.
  3. Navbar secondary navigation.
- **Visual Design**: Preserves Vibe On's modern Cyber glassmorphism styling, Outfit and Plus Jakarta Sans typography, and fluid Framer Motion list animations.

---

## 2. Feed Post Types & Format

The community feed strictly revolves around music experiences, not generic social posts:

1. **Shared Song (`song`)**:
   - Song metadata (id, name, artist, album, duration).
   - High-res artwork from permitted provider sources.
   - Author reflection / caption.
   - One-tap Play action (routes through `MusicApiService` and appends to or replaces current track without wiping entire queue).
2. **Shared Album / Playlist (`album`, `playlist`)**:
   - Catalog identifier, title, cover art, track count.
   - One-tap "Open in Player" / "Import to Library" action.
3. **Music Review / Recommendation (`review`)**:
   - Track or album reference + rating (1–5 stars) + written critique.
4. **Music Poll (`poll`)**:
   - Interactive options (e.g. *"Best track on the album?"*), live vote percentages, and expiration timers.
5. **Community Discussion (`discussion`)**:
   - Open forum topic tagged with genres (e.g. `#telugu-indie`, `#synthwave`, `#lofi`).

---

## 3. Guest Access vs. Authenticated Privileges

| User Capability | Guest (Unauthenticated) | Authenticated User |
|---|---|---|
| **Browse Community Feed** | Allowed (Public posts) | Allowed (Public + Friend posts) |
| **Play Shared Songs** | Allowed (Resolves via JioSaavn / cache) | Allowed |
| **Read Comments & Polls** | Allowed | Allowed |
| **Create Post / Poll** | Gated (Shows Sign-In modal) | Allowed |
| **Like / Heart Post** | Gated (Shows Sign-In modal) | Allowed |
| **Add Comment / Reply** | Gated (Shows Sign-In modal) | Allowed |
| **Follow / Unfollow Users**| Gated (Shows Sign-In modal) | Allowed |
| **Report Abuse** | Gated | Allowed |

---

## 4. Deterministic Ranking & Privacy Protections

1. **Deterministic Feed Scoring**:
   - Posts are scored using a transparent formula balancing recency and genuine engagement:
     $$\text{Score} = \frac{\text{likes} \times 2 + \text{comments} \times 3}{(\text{hours\_since\_posted} + 2)^{1.5}}$$
   - No opaque AI or paid external recommendation engines.
2. **Bidirectional Block Filtering**:
   - RLS policies and client selectors filter out any posts, comments, or profiles belonging to blocked users (checked against `public.friendships` where `status = 'blocked'`).
3. **Private Profiles**:
   - Users with `is_private = true` in `public.profiles` have their posts visible exclusively to accepted followers in `public.user_follows`.
