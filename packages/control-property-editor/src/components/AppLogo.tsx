import type { ReactElement } from 'react';
import React from 'react';
import { Text } from '@fluentui/react';
import { useTranslation } from 'react-i18next';

import styles from './AppLogo.module.scss';

/**
 * React element for app logo.
 *
 * @returns ReactElement
 */
export function AppLogo(): ReactElement {
    const { t } = useTranslation();
    return (
        <>
            <AppIcon />
            <Text className={styles.flexEditorText}>{t('APP_TITLE')}</Text>
        </>
    );
}

/**
 * React element for app icon.
 *
 * @returns ReactElement
 */
function AppIcon(): ReactElement {
    return (
        <span data-testid="Control-Property-Editor-Icon">
            <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                    d="M18.1988 19.7416L18.3835 22.6424L15.1241 24.2613L12.3644 21.4256L9.68087 24.6741L6.37801 23.5551L6.53012 19.4591L2.47759 19.9806L1.07605 16.7755L4.05297 13.8095L1 11.3106L2.32549 7.89908L4.80263 7.83389L6.37801 7.8013"
                    stroke="var(--vscode-icon-foreground)"
                    strokeWidth="1.5"
                    strokeMiterlimit="10"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
                <path
                    d="M14.092 17.5578C13.2228 18.0249 12.1798 18.2205 11.0825 18.0141C9.22461 17.6555 7.76875 16.0802 7.54059 14.2114C7.44281 13.4726 7.54059 12.7556 7.76874 12.1146"
                    stroke="var(--vscode-icon-foreground)"
                    strokeWidth="1.5"
                    strokeMiterlimit="10"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
                <path
                    d="M12.5708 5.28068C12.473 5.57402 12.2557 6.32369 12.2014 7.27978C12.1253 8.63786 12.4404 9.75692 12.6794 10.4197C12.3643 10.2458 11.8754 10.0285 11.2344 9.94162C10.7455 9.87643 10.3326 9.89816 10.0284 9.94162C9.53951 8.89861 8.88763 7.13854 8.82245 4.86782C8.77899 3.27072 9.03974 1.94523 9.30049 1C12.9728 1.30421 15.7432 3.85741 16.0583 6.79087C16.3517 9.49617 14.4503 11.5279 14.1244 11.8647"
                    stroke="var(--vscode-icon-foreground)"
                    strokeWidth="1.5"
                    strokeMiterlimit="10"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
                <path
                    d="M13.9724 2.95565C14.4287 2.46674 15.1132 1.89091 16.0584 1.48892C17.1666 1.02174 18.1553 0.989147 18.7203 1.01088C18.905 1.48892 19.0897 2.05388 19.1983 2.70576C19.5025 4.44411 19.22 5.91084 18.9593 6.81261C19.7633 6.64964 20.8389 6.5084 22.0992 6.57359C23.2617 6.62791 24.2504 6.83434 25.0001 7.05163C24.9892 7.50795 24.8914 9.93077 22.9792 11.7778C22.9358 11.8212 22.8814 11.8647 22.8271 11.919C22.3599 12.3319 21.0127 13.4618 18.9593 13.5813C18.3074 13.6139 17.2861 13.5813 16.0584 13.1033C15.5478 13.1033 15.3848 13.2336 15.3305 13.3423C15.2001 13.603 15.5587 13.9181 15.8085 14.5483C15.9389 14.8633 16.0476 15.2653 16.0476 15.7542C16.9167 16.1888 18.4269 16.8081 20.3934 16.9602C22.2839 17.1123 23.8158 16.7646 24.7393 16.4822C24.8154 16.1345 24.9023 15.5152 24.7393 14.7873C24.6198 14.2549 24.4242 13.8529 24.2613 13.5813"
                    stroke="var(--vscode-icon-foreground)"
                    strokeWidth="1.5"
                    strokeMiterlimit="10"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
                <path
                    d="M18.7205 9.91989C18.8182 9.93076 19.4701 9.97421 20.1655 10.1806C21.5235 10.5718 22.5448 11.3975 22.9685 11.7669"
                    stroke="var(--vscode-icon-foreground)"
                    strokeWidth="1.5"
                    strokeMiterlimit="10"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
        </span>
    );
}
