import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage'; // Use local storage for persistence
import { combineReducers } from '@reduxjs/toolkit';
import musicPlayerReducer from './features/musicplayer/musicPlayerSlice';
import recentlyPlayedReducer from './features/recentlyPlayed/recentlyPlayedSlice';
import languageReducer from './features/language/languageSlice';
import { apiSlice } from './features/api/apiSlice'; // Import apiSlice

// Combine reducers
const rootReducer = combineReducers({
    musicPlayer: musicPlayerReducer,
    recentlyPlayed: recentlyPlayedReducer,
    language: languageReducer,
    [apiSlice.reducerPath]: apiSlice.reducer, // Add apiSlice.reducer
});

const persistConfig = {
    key: 'root',
    storage,
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
    reducer: persistedReducer,
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(apiSlice.middleware), // Add apiSlice.middleware
});

export const persistor = persistStore(store);
