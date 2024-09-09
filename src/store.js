import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage'; // Use local storage for persistence
import { combineReducers } from '@reduxjs/toolkit';
import musicPlayerReducer from './features/musicPlayer/musicPlayerSlice';
import recentlyPlayedReducer from './features/recentlyPlayed/recentlyPlayedSlice';
import languageReducer from './features/language/languageSlice';

// Combine reducers
const rootReducer = combineReducers({
    musicPlayer: musicPlayerReducer,
    recentlyPlayed: recentlyPlayedReducer,
    language: languageReducer,
});

const persistConfig = {
    key: 'root',
    storage,
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
    reducer: persistedReducer,
});

export const persistor = persistStore(store);
