import type { TranslationEntry } from '@sap-ux/ui-components';
import React, { createContext, useCallback, useContext, useMemo } from 'react';
import type { TranslateEvent, TranslationProps } from '../types';

const TranslationContext = createContext<TranslationProps>({ bundle: {} });

export const useTranslation = () => useContext(TranslationContext);

export interface TranslationProviderProps<T extends TranslationEntry = TranslationEntry> extends TranslationProps<T> {
    children?: string | React.ReactElement;
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
            bundle: props.bundle,
            onEvent: handleEvent,
            pendingQuestions: props.pendingQuestions
        }),
        [props.bundle, handleEvent, props.pendingQuestions]
    );
    return <TranslationContext.Provider value={value}>{props.children}</TranslationContext.Provider>;
};
