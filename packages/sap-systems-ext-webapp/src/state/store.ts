import { configureStore } from '@reduxjs/toolkit';
import { bindActionCreators } from 'redux';
import { reducer, getInitialState } from './reducers.js';
import { postMessageMiddleware } from './middleware.js';
import * as AllActions from './actions.js';

export const store = configureStore({
    reducer,
    preloadedState: getInitialState(),
    devTools: false,
    middleware: [postMessageMiddleware]
});

export const actions = bindActionCreators(AllActions, store.dispatch);
