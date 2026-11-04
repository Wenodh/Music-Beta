# Phase 4 Testing, Verification & Device Validation Matrix 🧪📱

> **Document Status**: Production Test Strategy & Physical Device Checklist
> **Target Release**: Vibe On v1.0.3
> **Authors**: Product Quality Assurance & Test Engineering

---

## 1. Testing Environments & Verification Boundaries

| Test Category | Execution Environment | Status & Evidence | Scope |
|---|---|---|---|
| **Unit & Integration Tests** | Local Vitest v3.2.7 | **VERIFIED (192/192 Passing)** | Redux slices, drift math, RBAC logic, duplicate track backfill, reconciliation |
| **Static SQL & DDL Invariant Tests** | Node.js fs + Vitest (`migrationAudit.test.ts`) | **VERIFIED (7/7 Passing)** | RLS enablement on all 11 tables, search_path pinning, EXECUTE grants/revokes |
| **Clean Build & Linting** | Vite v6.4.5 + ESLint Flat Config | **VERIFIED (0 errors, 15.02s build)** | Production web bundle, PWA service worker, dynamic code splitting chunks |
| **Capacitor Android Sync & Build** | AGP 8.9.1 / Gradle 8.14.3 (`assembleDebug`) | **VERIFIED (BUILD SUCCESSFUL in 2m 26s)** | Native Android debug APK compilation with 171 executed Gradle tasks |
| **PostgreSQL Integration Tests** | Local/Clean Database Instance | **ENVIRONMENT RESTRICTION** | Sandbox container lacks direct `psql` or rootless Docker overlayfs permissions to spawn live Postgres; static AST & schema analysis executed |
| **Physical 2-Device Android Tests** | 2 Physical Devices on Separate Networks | **PENDING USER VALIDATION** | Checklist defined below; awaiting physical hardware testing by user |

---

## 2. Automated Testing Strategy

### 1.1 Unit & Integration Test Matrix (`vitest`)
1. **Group Listening Engine (`src/features/session/__tests__/`)**:
   - Room code generation, join, leave.
   - Initial state synchronization (`requestSync` -> `fullSync`).
   - Drift calculation and tier classification (<1.5s, 1.5–4.0s, >4.0s).
   - Temporary playback rate scaling ($1.02\times$ and $0.98\times$) and restoration.
   - Host heartbeat timeout and 30-second grace period trigger.
   - Stale broadcast rejection using `stateVersion`.
2. **Listening Parties & Discovery (`src/services/__tests__/partyService.test.ts`)**:
   - Party broadcast update and termination.
   - Discovery categorization (Active, Trending, Categories).
   - Participant limit constraints.
3. **Community Feed & Moderation (`src/features/social/__tests__/community.test.ts`)**:
   - Post creation, comment threads, reaction toggling.
   - Unauthenticated guest mutation rejection.
   - Blocked user content filtering.
4. **Collaborative Playlists (`src/services/__tests__/playlistCollaboration.test.ts`)**:
   - Fractional position calculation mid-point logic.
   - Duplicate track prevention.
   - Role-based mutation authorization.
   - JSONB backfill reconciliation.

---

## 2. Browser & Multi-Client Simulation Matrix (`Playwright`)

Multi-client tests simulate concurrent user interactions in headless Chromium:
- **Test 1: Host-Participant Playback Sync**: Host plays track $\to$ Participant receives `play` within 200ms $\to$ Host seeks to 01:30 $\to$ Participant aligns to 01:30 without audio glitches.
- **Test 2: Micro-Drift Correction**: Simulate artificial 2.5s network lag on participant $\to$ Participant temporarily scales rate to 1.02x $\to$ Participant resynchronizes and restores base rate.
- **Test 3: Host Disconnect Grace Period**: Host tab is closed $\to$ Participant enters `reconnecting` state with 30s countdown $\to$ Host reopens within 30s $\to$ Host control resumes.
- **Test 4: Host Election**: Host tab terminates $\to$ 30s grace expires $\to$ Participant promotes to Host.
- **Test 5: Concurrent Playlist Curation**: User A inserts Song at position 1; User B inserts Song at position 2 concurrently $\to$ Both songs appear in deterministic order without loss.

---

## 3. Physical Android Device Verification Checklist 📋 (PENDING HARDWARE EXECUTION)

*Note: Because physical USB hardware is not attached in the headless container development environment, the following verification checklist remains PENDING until physically executed on two real Android devices connected across separate networks (e.g. Device A on 5G Cellular, Device B on Home Wi-Fi).*

### Test Suite 1: Synchronized Group Listening (2 Devices on Separate Networks)
- [ ] **Step 1.1**: Open Vibe On APK on Device A (Host, 5G). Start a Listening Party. Note the 6-character room code.
- [ ] **Step 1.2**: Open Vibe On APK on Device B (Participant, Wi-Fi). Enter room code and join.
- [ ] **Step 1.3**: Verify Device B displays Device A's Now Playing song, album art, and participant list.
- [ ] **Step 1.4**: Device A taps Play. Verify Device B begins playback synchronously within $\approx 200$ms.
- [ ] **Step 1.5**: Device A seeks to 02:00. Verify Device B smoothly seeks to 02:00 without loop-seeking.
- [ ] **Step 1.6**: Background Device B (press Home button). Verify audio continues playing in background via Android Foreground Service / MediaSession.
- [ ] **Step 1.7**: Toggle Device A to Airplane mode (simulating host drop). Verify Device B shows 30-second grace period banner. Turn off Airplane mode on Device A within 20s. Verify room resumes active state seamlessly.
- [ ] **Step 1.8**: Repeat 1.7 but keep Device A disconnected past 30s. Verify Device B promotes to Host and gains playback controls.

### Test Suite 2: Public Listening Parties & Discovery
- [ ] **Step 2.1**: Device A hosts a Public Party named "Indie Vibes".
- [ ] **Step 2.2**: Device B opens Session Modal -> Discover tab. Verify "Indie Vibes" appears with live listener count (1) and real song art.
- [ ] **Step 2.3**: Device B taps Join. Verify Device B enters party and listener count updates to 2 on both screens.
- [ ] **Step 2.4**: Device B sends emoji reactions (❤️, 🔥). Verify reactions float across Device A's screen.

### Test Suite 3: Community Music Discovery
- [ ] **Step 3.1**: Navigate to `/community` on Device A. Share currently playing song with caption "Classic track!".
- [ ] **Step 3.2**: On Device B, refresh Community Feed. Verify post appears with song card.
- [ ] **Step 3.3**: Tap Play on the shared song card on Device B. Verify song starts playing without replacing the existing queue.
- [ ] **Step 3.4**: Test guest mode: Log out on Device B, tap Like or Comment. Verify sign-in prompt appears.

### Test Suite 4: Collaborative Playlists
- [ ] **Step 4.1**: Device A creates a playlist and toggles "Collaborative". Invites Device B.
- [ ] **Step 4.2**: Device B accepts invitation. Adds 2 songs.
- [ ] **Step 4.3**: Device A drags to reorder songs. Verify Device B receives real-time reorder update without page reload.
