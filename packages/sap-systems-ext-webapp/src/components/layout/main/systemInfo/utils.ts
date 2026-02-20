import type { TFunction } from 'i18next';
import { useState, useEffect, useCallback } from 'react';

/**
 * Validates a URL and returns an error message if the URL has a pathname beyond '/'.
 *
 * @param value - the URL string to validate
 * @param t - the translation function
 * @param connectionType - the type of connection to determine specific validation rules
 * @returns - the error message if validation fails, undefined otherwise
 */
export const getUrlErrorMessage = (value: string, t: TFunction, connectionType?: string): string | undefined => {
    let urlMessage: string | undefined;
    try {
        const url = new URL(value);
        if (connectionType !== 'odata_service' && url.pathname && url.pathname !== '/') {
            urlMessage = t('validations.systemUrlOriginOnlyWarning');
        }
    } catch {
        // ignore
    }
    return urlMessage;
};

/**
 * Custom hook to detect text overflow in an input field and manage editing state.
 * Useful for conditionally showing tooltips only when text is truncated.
 * Also to not show tooltip while user is actively editing the field.
 *
 * @param inputId - the DOM ID of the input element to monitor
 * @param value - the current value of the input (triggers overflow recheck on change)
 * @returns object containing overflow state, editing state, and event handlers
 */
export const useTextInputOverflow = (
    inputId: string,
    value: string | undefined
): {
    isEditing: boolean;
    isOverflowing: boolean;
    onEditStart: () => void;
    onEditEnd: () => void;
} => {
    const [isEditing, setIsEditing] = useState(false);
    const [isOverflowing, setIsOverflowing] = useState(false);

    const checkOverflow = useCallback((): void => {
        const inputElement = document.getElementById(inputId) as HTMLInputElement;
        if (inputElement) {
            setIsOverflowing(inputElement.scrollWidth > inputElement.clientWidth);
        }
    }, [inputId]);

    useEffect(() => {
        const timeoutId = setTimeout(checkOverflow, 0);
        let resizeObserver: ResizeObserver | undefined;

        const inputElement = document.getElementById(inputId) as HTMLInputElement;
        if (inputElement && typeof ResizeObserver !== 'undefined') {
            resizeObserver = new ResizeObserver(checkOverflow);
            resizeObserver.observe(inputElement);
        }

        return (): void => {
            clearTimeout(timeoutId);
            resizeObserver?.disconnect();
        };
    }, [value, checkOverflow]);

    return {
        isEditing,
        isOverflowing,
        onEditStart: () => setIsEditing(true),
        onEditEnd: () => setIsEditing(false)
    };
};
