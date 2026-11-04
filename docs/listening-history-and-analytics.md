# Vibe On — Listening History & Analytics Architecture

> **Sprint Reference**: Sprint 3.4: Listening Analytics & Personal Insights
> **Status**: Production Implementation

---

## 1. Overview & Objectives

The Listening History & Analytics engine (`src/services/analyticsService.ts`, `/stats` route) provides transparent, speed-adjusted metrics of user music consumption. It enables users to discover their listening habits, top tracks, and artist preferences across customizable time intervals (7 days, 30 days, 90 days, and All Time).

---

## 2. Speed-Adjusted Listening Calculations

A track's raw duration does not always match real-world user listening time when custom playback rates are applied.
$$\text{Real Listening Time} = \frac{\text{Duration Played (seconds)}}{\text{Playback Speed}}$$

- Example: A 200-second song listened to at `2.0x` speed logs `100 seconds` of real human listening time.
- Calculations run client-side without costly server aggregate tables, ensuring instant computation and complete offline accessibility for guest users.

---

## 3. UI Entry Points

1. **Profile (`/profile`)**: Featured "Listening Insights & Stats" card providing one-tap navigation to `/stats`.
2. **Library**: Direct route access to `/stats`.
