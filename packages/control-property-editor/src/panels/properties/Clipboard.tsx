import type { ReactElement } from 'react';
import React from 'react';
import { Icon } from '@fluentui/react';
import { UICallout, UICalloutContentPadding, UiIcons } from '@sap-ux/ui-components';
import { useTranslation } from 'react-i18next';
import { defaultFontSize } from './constants';

export interface ClipboardProps {
    label: string;
}

/**
 * React element for Clipboard.
 *
 * @param clipBoardProps ClipboardProps
 * @returns ReactElement
 */
export function Clipboard(clipBoardProps: ClipboardProps): ReactElement {
    const { label } = clipBoardProps;
    const { t } = useTranslation();
    return (
        <UICallout
            styles={{
                root: {
                    boxShadow: 'none'
                },
                calloutMain: {
                    minWidth: 0,
                    padding: '5px 10px 5px 5px',
                    outline: '1px solid var(--vscode-charts-green) !important',
                    borderRadius: '2px',
                    fontSize: defaultFontSize
                }
            }}
            target={`#${label.replace(/\s/g, '')}--copy`}
            isBeakVisible={false}
            gapSpace={5}
            directionalHint={9}
            contentPadding={UICalloutContentPadding.None}>
            <span data-testid="copied-to-clipboard-popup" style={{ display: 'flex', alignItems: 'center' }}>
                <Icon iconName={UiIcons.Success} style={{ display: 'flex' }} />
                <span data-testid="copied-to-clipboard-message" style={{ marginLeft: '5px' }}>
                    {t('COPIED_TO_CLIPBOARD')}
                </span>
            </span>
        </UICallout>
    );
}
