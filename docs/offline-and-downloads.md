# Vibe On — Audio Quality & Offline Experience Architecture

> **Sprint Reference**: Sprint 3.5: Audio Quality & Offline Experience
> **Status**: Production Implementation

---

## 1. Overview & Objectives

Vibe On guarantees uncompromised offline playback through browser-backed IndexedDB blob persistence (`vibeon_offline`), bounded-concurrency background downloads, and network-aware quality selection.

---

## 2. Storage Quota & Corruption Recovery

### Storage Quota Management:
- Uses `navigator.storage.estimate()` where supported to display actual device quota and application usage.
- If storage estimates are unavailable (e.g. older Android WebView builds), falls back to computing exact IndexedDB blob sizes.

### Corrupted Blob Cleaning:
- `cleanCorruptedOfflineSongs()` in `src/utils/db.ts` iterates through saved offline entries on startup/reconciliation and deletes records where `audioBlob.size === 0` or media blobs failed to persist completely.
- Preserves user cloud favorites; deleting an offline file removes only local blobs without triggering a Supabase `favorites` delete.

---

## 3. Web Audio Equalizer Preservation

- 10-band hardware-tuned biquad filters (32Hz to 16kHz) with presets (Flat, Bass Boost, Treble Boost, Vocal, Classical, Rock, Electronic, Hip Hop, Pop, Custom).
- Single AudioContext lifecycle initialized via user gesture to conform to browser autoplay restrictions.
- Dual-buffer gain routing ensures crossfades and track transitions remain unaffected by active filter gains.
