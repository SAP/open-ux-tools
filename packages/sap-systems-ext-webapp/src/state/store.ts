import { configureStore } from '@reduxjs/toolkit';
import { bindActionCreators } from 'redux';
import { reducer, getInitialState } from './reducers';
import { postMessageMiddleware } from './middleware';
import * as AllActions from './actions';

export const store = configureStore({
    reducer,
    preloadedState: getInitialState(),
    devTools: false,
    middleware: [postMessageMiddleware]
});

export const actions = bindActionCreators(AllActions, store.dispatch);
