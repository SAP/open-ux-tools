import React from 'react';
import { Text } from '@fluentui/react';
import { useTranslation } from 'react-i18next';

const NoControlSelected = () => {
    const { t } = useTranslation();
    return (
        <>
            <Text className="properties-no-control-selected-text">{t('NO_CONTROL_SELECTED')}</Text>
            <Text className="properties-modify-text">{t('PROPERTIES_MODIFY_TEXT')}</Text>
            <div className="properties-control-select-icon">
                {
                    <svg
                        data-testid="Control-Property-Editor-No-Control-Selected"
                        width="80"
                        height="37"
                        viewBox="0 0 80 37"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg">
                        <path
                            fillRule="evenodd"
                            clipRule="evenodd"
                            d="M0 2.75V0H3.16666V2H2V2.75H0ZM15.8333 0H9.5V2H15.8333V0ZM22.1667 0V2H28.5V0H22.1667ZM34.8333 0V2H41.1667V0H34.8333ZM47.5 0V2H53.8333V0H47.5ZM60.1667 0V2H66.5V0H60.1667ZM72.8333 0V2H74V2.75H76V0H72.8333ZM76 8.25H74V13.75H76V8.25ZM76 19.25H74V24.75H76V19.25ZM76 30.25H74V31H72.8333V33H76V30.25ZM66.5 33V31H60.1667V33H66.5ZM53.8333 33V31H47.5V33H53.8333ZM41.1667 33V31H34.8333V33H41.1667ZM28.5 33V31H22.1667V33H28.5ZM15.8333 33V31H9.5V33H15.8333ZM3.16667 33V31H2V30.25H0V33H3.16667ZM0 24.75H2V19.25H0V24.75ZM0 13.75H2V8.25H0V13.75Z"
                            fill="var(--vscode-focusBorder)"
                        />
                        <path d="M66 12H69V20H66V12Z" fill="var(--vscode-icon-foreground)" />
                        <path d="M72 23H80V26H72V23Z" fill="var(--vscode-icon-foreground)" />
                        <path d="M63 23H55V26H63V23Z" fill="var(--vscode-icon-foreground)" />
                        <path d="M66 29H69V37H66V29Z" fill="var(--vscode-icon-foreground)" />
                        <path d="M69 23H66V26H69V23Z" fill="var(--vscode-icon-foreground)" />
                    </svg>
                }
            </div>
        </>
    );
};

export { NoControlSelected };
