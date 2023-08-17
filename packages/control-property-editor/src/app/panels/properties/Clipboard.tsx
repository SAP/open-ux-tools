import type { ReactElement } from 'react';
import React from 'react';
import { UICallout, UICalloutContentPadding } from '@sap-ux/ui-components';
import { useTranslation } from 'react-i18next';
import { defaultFontSize } from './constants';

export interface ClipboardProps {
    label: string;
}

/**
 * React element for Clipboard.
 *
 * @param clipBoardProps
 * @returns {ReactElement}
 */
export function Clipboard(clipBoardProps: ClipboardProps): ReactElement {
    const { label } = clipBoardProps;
    const { t } = useTranslation();
    return (
        <UICallout
            styles={{
                calloutMain: {
                    minWidth: 0,
                    padding: '5px 10px 5px 10px',
                    outline: '1px solid var(--vscode-terminal-ansiGreen) !important',
                    fontSize: defaultFontSize
                }
            }}
            target={`#${label.replace(/\s/g, '')}--copy`}
            isBeakVisible={false}
            gapSpace={5}
            directionalHint={9}
            contentPadding={UICalloutContentPadding.None}>
            <span data-testid="copied-to-clipboard-popup" style={{ display: 'flex', alignItems: 'center' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
                    <path
                        fill="var(--vscode-terminal-ansiGreen)"
                        fillRule="evenodd"
                        d="M7.497,10.97678 C7.365,10.97478 7.239,10.92078 7.147,10.82678 L4.147,7.82678 C3.951,7.63078 3.951,7.31278 4.147,7.11678 C4.343,6.92078 4.661,6.92078 4.857,7.11678 L7.477,9.71678 L11.107,5.15678 C11.296,4.95578 11.613,4.94678 11.814,5.13678 C11.991,5.30378 12.022,5.57378 11.887,5.77678 L7.887,10.77678 C7.799,10.88778 7.668,10.95678 7.527,10.96678 L7.497,10.97678 Z M8,1 C11.86,1 15,4.14 15,8 C15,11.86 11.86,15 8,15 C4.14,15 1,11.86 1,8 C1,4.14 4.14,1 8,1 M8,0 C3.582,0 0,3.582 0,8 C0,12.418 3.582,16 8,16 C12.418,16 16,12.418 16,8 C16,3.582 12.418,0 8,0"></path>
                </svg>
                <span data-testid="copied-to-clipboard-message" style={{ marginLeft: '5px' }}>
                    {t('COPIED_TO_CLIPBOARD')}
                </span>
            </span>
        </UICallout>
    );
}
