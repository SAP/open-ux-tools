import React from 'react';
import { Text } from '@fluentui/react';
import { useTranslation } from 'react-i18next';

const NoControlFound = () => {
    const { t } = useTranslation();
    return (
        <>
            <Text className="tree-no-control-found">{t('NO_CONTROL_FOUND')}</Text>
            <Text className="tree-modify-search-input">{t('MODIFY_SEARCH_INPUT')}</Text>
            <div className="tree-search-icon">
                <svg
                    data-testid="Control-Property-Editor-No-Search-Matched-Icon"
                    width="49"
                    height="49"
                    viewBox="0 0 49 49"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg">
                    <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M20 40C31.0457 40 40 31.0457 40 20C40 8.9543 31.0457 0 20 0C8.9543 0 0 8.9543 0 20C0 31.0457 8.9543 40 20 40ZM20 37C29.3888 37 37 29.3888 37 20C37 10.6112 29.3888 3 20 3C10.6112 3 3 10.6112 3 20C3 29.3888 10.6112 37 20 37Z"
                        fill="var(--vscode-icon-foreground)"
                    />
                    <rect
                        x="33"
                        y="35.1213"
                        width="3"
                        height="19.2712"
                        transform="rotate(-45 33 35.1213)"
                        fill="var(--vscode-icon-foreground)"
                    />
                    <rect x="15" y="13" width="2" height="7" fill="var(--vscode-focusBorder)" />
                    <rect x="23" y="13" width="2" height="7" fill="var(--vscode-focusBorder)" />
                    <path
                        d="M12.5815 28C13.7683 25.0682 16.6426 23 20 23C23.3574 23 26.2317 25.0682 27.4185 28H25.1973C24.1599 26.2066 22.2208 25 20 25C17.7792 25 15.8401 26.2066 14.8027 28H12.5815Z"
                        fill="var(--vscode-focusBorder)"
                    />
                </svg>
            </div>
        </>
    );
};

export { NoControlFound };
