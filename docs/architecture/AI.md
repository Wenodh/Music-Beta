# AI & Recommendations Architecture

Vibe On uses a client-side recommendation engine to personalize the discovery experience without compromising user privacy.

## Personalization Engine

### Taste Profile
The `TasteProfileService` aggregates user history and favorites to build a local interest map:
- **Genre Affinities**: Weighted scores based on listening frequency and manual likes.
- **Artist Affinities**: Tracks engagement with specific artists.
- **Temporal Patterns**: Preferences for specific times of day or moods.

### Recommendation Pipeline
`RecommendationService` processes candidate tracks through a series of weighted extractors:

1. **GenreAffinityExtractor**: Compares track genres with the user's top-rated genres.
2. **ArtistAffinityExtractor**: Boosts tracks from followed or frequently played artists.
3. **Smart Heuristics**: Intent recognition for search queries (e.g., "gym music" vs. "chill beats").

## Discovery Features

### 1. Smart Discovery (Globe)
The 3D Globe uses a spatial recommendation algorithm to cluster similar tracks geographically, allowing users to "fly" through musical landscapes.

### 2. Smart Search
Uses heuristic intent recognition to prioritize results based on the user's current context and previous searches.

### 3. Listening Insights
A dashboard that visualizes the user's taste profile, showing top genres and artists over time, powered by the `InsightsService`.

## Privacy-First Approach
Unlike traditional streaming platforms, the core recommendation logic runs **locally** on the user's device. While history is synced to the cloud for cross-device continuity, the extraction and scoring of affinities happen on-device, ensuring the user's behavioral profile remains private.
