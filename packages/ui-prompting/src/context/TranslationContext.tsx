import type { TranslationEntry, I18nBundle } from '@sap-ux/ui-components';
import React, { createContext, useContext } from 'react';

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
    entries: I18nBundle<TranslationEntry>;
    triggerEvent?: (event: TranslateEvent<T>) => void;
}

const TranslationContext = createContext<TranslationContext>({ entries: {} });

export const useTranslation = () => useContext(TranslationContext);

export interface TranslationProviderProps<T extends TranslationEntry = TranslationEntry> {
    children?: string | React.ReactElement;
    bundle: I18nBundle<T>;
    onEvent?: (event: TranslateEvent<T>) => void;
}

export const TranslationProvider = <T extends TranslationEntry>(props: TranslationProviderProps<T>) => {
    const { onEvent } = props;
    const handleEvent = (event: TranslateEvent<TranslationEntry>) => {
        onEvent?.(event as TranslateEvent<T>);
    };
    return (
        <TranslationContext.Provider
            value={{
                entries: props.bundle,
                triggerEvent: handleEvent
            }}>
            {props.children}
        </TranslationContext.Provider>
    );
};
