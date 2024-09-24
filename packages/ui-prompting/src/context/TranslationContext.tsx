import type { TranslationEntry, I18nBundle } from '@sap-ux/ui-components';
import React, { createContext, useCallback, useContext, useMemo } from 'react';

// Move to generic types?
export const TRANSLATE_EVENT_UPDATE = 'update';
export const TRANSLATE_EVENT_SHOW = 'show';
export interface TranlateUpdateEvent<T extends TranslationEntry> {
    name: typeof TRANSLATE_EVENT_UPDATE;
    entry: T;
}
export interface TranlateShowEvent<T extends TranslationEntry> {
    name: typeof TRANSLATE_EVENT_SHOW;
    entry: T;
}

export type TranslateEvent<T extends TranslationEntry> = TranlateUpdateEvent<T> | TranlateShowEvent<T>;

export interface TranslationContext<T extends TranslationEntry = TranslationEntry> {
    entries: I18nBundle<T>;
    triggerEvent?: (question: string, event: TranslateEvent<T>) => void;
    /**
     * Array of pending question.
     */
    pendingQuestions?: string[];
}

const TranslationContext = createContext<TranslationContext>({ entries: {} });

export const useTranslation = () => useContext(TranslationContext);

export interface TranslationProviderProps<T extends TranslationEntry = TranslationEntry> {
    children?: string | React.ReactElement;
    bundle: I18nBundle<T>;
    onEvent?: (question: string, event: TranslateEvent<T>) => void;
    pendingQuestions?: string[];
}

export const TranslationProvider = <T extends TranslationEntry>(props: TranslationProviderProps<T>) => {
    const { onEvent } = props;
    const handleEvent = useCallback(
        (question: string, event: TranslateEvent<TranslationEntry>): void => {
            onEvent?.(question, event as TranslateEvent<T>);
        },
        [onEvent]
    );
    const value = useMemo(
        () => ({
            entries: props.bundle,
            triggerEvent: handleEvent,
            pendingQuestions: props.pendingQuestions
        }),
        [props.bundle, handleEvent, props.pendingQuestions]
    );
    return <TranslationContext.Provider value={value}>{props.children}</TranslationContext.Provider>;
};
