import { createSlice } from '@reduxjs/toolkit';

const languageSlice = createSlice({
    name: 'language',
    initialState: 'telugu', // Default to 'telugu'
    reducers: {
        setLanguage: (state, action) => action.payload,
    },
});

export const { setLanguage } = languageSlice.actions;
export default languageSlice.reducer;
