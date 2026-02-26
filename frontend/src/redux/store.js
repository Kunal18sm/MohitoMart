import { configureStore } from '@reduxjs/toolkit';

// We will add slices here later
export const store = configureStore({
    reducer: {
        _init: (state = {}) => state,
    },
});

export default store;
