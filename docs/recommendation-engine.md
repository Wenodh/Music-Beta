# Vibe On — Recommendation Engine Architecture & Scoring Model

> **Sprint Reference**: Sprint 3.2: Intelligent Music Discovery
> **Status**: Production Implementation

---

## 1. Overview & Objectives

The Vibe On Recommendation Engine (`src/services/recommendationEngine.ts`) delivers transparent, fast, and deterministic track discovery. Rather than relying on black-box external AI services that incur network latency and API costs, it runs entirely on-device, leveraging local and synced signals from both guest and authenticated users.

---

## 2. Recommendation Signals & Scoring Model

The engine scores candidate songs using a weighted composite model:

$$\text{Score} = \text{Novelty Base (1.0)} + \sum \text{Affinity Points} \times \text{Diversity Factor}$$

### Signal Weights:
1. **Favorite Track Artists (+5.0 points)**:
   - High-confidence explicit indicator of musical preference.
2. **Recently Played Recency (+3.0 to +1.0 points)**:
   - Tracks played within the last 5 sessions receive higher affinity weight.
3. **Explicit Dismissal (Exclusion)**:
   - Songs or recommendations dismissed by the user are cached in `dismissedIds` (persisted in LocalStorage) and immediately filtered from future candidate sets.
4. **Diversity Penalty ($\times 0.7^n$)**:
   - To prevent an artist with dozens of catalog entries from dominating recommendations, every additional song selected from the same primary artist is penalized by $0.7$ raised to the power of previous selections, capped at a maximum of 3 tracks per artist.

---

## 3. Explanations & Transparency

Every scored candidate includes a plain-language `reason`:
- `"Because you like [Artist Name]"` when matched via artist affinity.
- `"Recommended for you"` for novel exploration tracks.

---

## 4. Guest & Authenticated Support

- **Guest Users**: Recommendations derive immediately from IndexedDB/LocalStorage history and favorites without requiring login or cloud sync.
- **Authenticated Users**: History and favorites synchronized via Supabase PostgreSQL update local candidate weights on hydration.
