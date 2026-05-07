import { UIIcon } from '@sap-ux/ui-components';
import type { ReactElement } from 'react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { IconName } from '../../src/icons';

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

    if (saved > 0 && pending === 0) {
        return <UIIcon iconName={IconName.filledCircle} title={ChangeIndicatorTooltip(props)} {...rest} />;
    }

    if (pending > 0 && saved === 0) {
        return <UIIcon iconName={IconName.unfilledCircle} title={ChangeIndicatorTooltip(props)} {...rest} />;
    }

    return <UIIcon iconName={IconName.partiallyFilledCircle} title={ChangeIndicatorTooltip(props)} {...rest} />;
}

/**
 * React element for change indicator tooltip.
 *
 * @param changeIndicatorProps - ChangeIndicatorProps
 * @returns string
 */
function ChangeIndicatorTooltip(changeIndicatorProps: ChangeIndicatorProps): string {
    const { saved, pending, type } = changeIndicatorProps;
    const { t } = useTranslation();
    if (saved > 0 && pending === 0) {
        return t('SAVED_CHANGES', { type: type });
    }

    if (pending > 0 && saved === 0) {
        return t('UNSAVED_CHANGES', { type: type });
    }
    return t('SAVED_AND_UNSAVED_CHANGES', { type: type });
}
