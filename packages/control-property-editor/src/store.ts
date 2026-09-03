import { configureStore, compose, applyMiddleware } from '@reduxjs/toolkit';
import { useDispatch } from 'react-redux';
import { communicationMiddleware } from './middleware.js';
import reducer from './slice.js';
import { webSocketMiddleware } from './ws-middleware.js';

declare let window: Window & { __REDUX_DEVTOOLS_EXTENSION_COMPOSE__: <R>(data: R) => R };
const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ ?? compose;

export const store = configureStore({
    reducer,
    devTools: false,
    middleware: [],
    enhancers: [composeEnhancers(applyMiddleware(communicationMiddleware, webSocketMiddleware))]
});

export type AppDispatch = typeof store.dispatch;
export const useAppDispatch = (): AppDispatch => useDispatch<AppDispatch>();

export type RootState = ReturnType<typeof store.getState>;
