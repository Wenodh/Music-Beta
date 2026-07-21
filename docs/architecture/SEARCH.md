# Search Architecture

The Search system in Vibe On provides a unified interface for discovering content across multiple providers.

## Flow

1. **User Input**: User types in the `Navbar` search bar.
2. **Debounce**: Input is debounced by 500ms to reduce API load.
3. **AudioSDK Query**: `audioSDK.search(query)` is called.
   - Queries all registered providers.
   - Deduplicates results based on title and metadata.
4. **Adapter Conversion**: `SearchAdapter.mediaItemsToSearchResults()` converts provider-agnostic `MediaItem` objects into legacy UI models (`Song`, `Album`, etc.) for backward compatibility with the UI.
5. **Redux Update**: Results are stored in `musicPlayerSlice` under `searchedSongs`.
6. **UI Rendering**: `SearchSection` (overlay) and `SearchPage` display the results.

## Subsystems

### SearchProvider
Specific implementations (e.g., `JioSaavnProvider.search`) handle the mapping of external API responses to `MediaItem`.

### SearchAdapter
Handles the transformation of data for the UI. It ensures that fields like artwork URLs and metadata are correctly mapped for consistent rendering.

### Performance
- **Virtualization**: `SearchSection` uses `react-virtuoso` to efficiently render large result sets without UI lag.
- **Caching**: Search results are cached by the `globalCache` in the SDK to provide instantaneous responses for repeated queries.

## UI Components

- **Navbar**: Main entry point for search input.
- **SearchSection**: Overlay that displays live results as the user types.
- **SearchPage**: Full-screen view for search results (fallback).
