import React from 'react';
import { Text } from '@fluentui/react';
import { useTranslation } from 'react-i18next';
import styles from './ChangesPanel.module.scss';

const NoChangesFound = () => {
    const { t } = useTranslation();
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingTop: '30px' }}>
            <Text className={styles.noChangesFoundTitle}>{t('NO_CHANGES_FOUND_TITLE')}</Text>
            <Text className={styles.noChangesFoundDescription}>{t('NO_CHANGES_FOUND_DESCRIPTION')}</Text>
            <div className={styles.historyGlockIcon}>
                <svg
                    width="42"
                    height="43"
                    viewBox="0 0 42 43"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    data-testid="Control-Property-Editor-No-Changes-Icon">
                    <path
                        d="M20 11H22V19.1707C23.1652 19.5825 24 20.6938 24 22C24 23.6569 22.6569 25 21 25C20.5322 25 20.0895 24.8929 19.6949 24.702L11.4142 32.9827L10 31.5685L18.2868 23.2817C18.1029 22.893 18 22.4585 18 22C18 20.6938 18.8348 19.5825 20 19.1707V11Z"
                        fill="var(--vscode-focusBorder)"
                    />
                    <path d="M0 21H3V23H0V21Z" fill="var(--vscode-focusBorder)" />
                    <path
                        d="M2.38847 31.6339L4.98654 30.1339L5.98654 31.866L3.38847 33.366L2.38847 31.6339Z"
                        fill="var(--vscode-focusBorder)"
                    />
                    <path
                        d="M5.23223 35.916L7.35355 33.7947L8.76776 35.2089L6.64644 37.3302L5.23223 35.916Z"
                        fill="var(--vscode-focusBorder)"
                    />
                    <path
                        d="M0.542286 26.6097L3.44006 25.8333L3.9577 27.7651L1.05992 28.5416L0.542286 26.6097Z"
                        fill="var(--vscode-focusBorder)"
                    />
                    <path
                        d="M7 0H4V12H16V9H8.45358C11.512 5.81018 16.5061 4 21 4C30.9411 4 39 12.0589 39 22C39 31.9411 30.9411 40 21 40C17.1351 40 13.5547 38.7819 10.6217 36.7087L8.47372 38.8567C11.9708 41.4596 16.3055 43 21 43C32.598 43 42 33.598 42 22C42 10.402 32.598 1 21 1C15.6215 1 10.7153 3.02197 7 6.34726V0Z"
                        fill="var(--vscode-icon-foreground)"
                    />
                </svg>
            </div>
        </div>
    );
};

export { NoChangesFound };
