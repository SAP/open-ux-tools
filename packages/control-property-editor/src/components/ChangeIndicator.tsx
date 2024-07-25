import type { ReactElement } from 'react';
import React from 'react';
import { useTranslation } from 'react-i18next';

interface ChangeIndicatorProps {
    saved: number;
    pending: number;
    id?: string;
    type: string;
}

/**
 * React element for change indicator.
 *
 * @param props - ChangeIndicatorProps
 * @returns ReactElement
 */
export function ChangeIndicator(props: ChangeIndicatorProps): ReactElement {
    const { saved, pending, id } = props;
    const rest = { id };
    const color = 'var(--vscode-terminal-ansiGreen)';

    if (saved > 0 && pending === 0) {
        return (
            <svg
                role="img"
                width="8"
                height="8"
                viewBox="0 0 8 8"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                {...rest}>
                <ChangeIndicatorTooltip {...props} />
                <circle cx="4" cy="4" r="4" fill={color} />
            </svg>
        );
    }

    if (pending > 0 && saved === 0) {
        return (
            <svg
                role="img"
                width="8"
                height="8"
                viewBox="0 0 8 8"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                {...rest}>
                <ChangeIndicatorTooltip {...props} />
                <circle cx="4" cy="4" r="3.5" stroke={color} />
            </svg>
        );
    }

    return (
        <svg role="img" width="8" height="8" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg" {...rest}>
            <ChangeIndicatorTooltip {...props} />
            <circle cx="4" cy="4" r="3.5" stroke={color} />
            <path d="M4 8a4 4 0 1 0 0-8v8Z" fill={color} />
        </svg>
    );
}

/**
 * React element for change indicator tooltip.
 *
 * @param changeIndicatorProps - ChangeIndicatorProps
 * @returns ReactElement
 */
function ChangeIndicatorTooltip(changeIndicatorProps: ChangeIndicatorProps): ReactElement {
    const { saved, pending, type } = changeIndicatorProps;
    const { t } = useTranslation();
    if (saved > 0 && pending === 0) {
        return <title>{t('SAVED_CHANGES', { type: type })}</title>;
    }

    if (pending > 0 && saved === 0) {
        return <title>{t('UNSAVED_CHANGES', { type: type })}</title>;
    }
    return <title>{t('SAVED_AND_UNSAVED_CHANGES', { type: type })}</title>;
}
