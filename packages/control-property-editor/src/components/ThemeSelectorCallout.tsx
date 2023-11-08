import { UIIconButton, UiIcons, UICallout } from '@sap-ux/ui-components';
import type { ReactElement } from 'react';
import React, { useState } from 'react';
import { useId } from '@fluentui/react-hooks';
import { useTranslation } from 'react-i18next';

import './ThemeSelectorCallout.scss';

export type ThemeName = 'dark' | 'light' | 'high contrast';

/**
 * React element for theme selector.
 *
 * @returns ReactElement
 */
export function ThemeSelectorCallout(): ReactElement {
    const { t } = useTranslation();
    const [isCalloutVisible, setValue] = useState(false);
    const theme = localStorage.getItem('theme') ?? 'dark';
    const [currentTheme, setTheme] = useState(theme);
    const buttonId = useId('callout-button');

    /**
     *
     * @param newTheme - ThemeName
     */
    function updateTheme(newTheme: ThemeName): void {
        setTheme(newTheme);
        localStorage.setItem('theme', newTheme);
        setThemeOnDocument(newTheme);
    }
    interface ThemeButtonProps {
        name: string;
        tooltip: string;
    }
    const themes: ThemeButtonProps[] = [
        {
            name: 'light',
            tooltip: 'LIGHT_THEME_NAME'
        },
        {
            name: 'dark',
            tooltip: 'DARK_THEME_NAME'
        },
        {
            name: 'high contrast',
            tooltip: 'HIGH_CONTRAST_THEME_NAME'
        }
    ];

    /**
     * React element for theme button.
     *
     * @param themeButtonProps - ThemeButtonProps
     * @returns ReactElement
     */
    function createThemeButton(themeButtonProps: ThemeButtonProps): ReactElement {
        const { name, tooltip } = themeButtonProps;
        const nameSlug = name.replace(/ /g, '-');
        const isCurrentTheme = currentTheme === name;
        return (
            <div
                id={`theme-${nameSlug}-rect`}
                key={name}
                title={t(tooltip)}
                className={`theme-child${isCurrentTheme ? ' selected' : ''}`}
                style={{
                    pointerEvents: 'auto',
                    cursor: 'pointer'
                }}
                role="button"
                aria-pressed={isCurrentTheme}
                onClick={(): void => {
                    updateTheme(name as ThemeName);
                }}>
                <div id={`theme-${nameSlug}`}></div>
            </div>
        );
    }

    return (
        <>
            <UIIconButton
                id={buttonId}
                iconProps={{
                    iconName: UiIcons.Settings
                }}
                title={t('SETTINGS')}
                onClick={(): void => {
                    setValue(!isCalloutVisible);
                }}
            />
            {isCalloutVisible && (
                <UICallout
                    id={'themes-selector'}
                    role="alertdialog"
                    alignTargetEdge
                    target={`#${buttonId}`}
                    finalHeight={45}
                    isBeakVisible={true}
                    beakWidth={5}
                    directionalHint={1}
                    styles={{
                        calloutMain: {
                            minWidth: 100
                        }
                    }}
                    onDismiss={(): void => {
                        setValue(false);
                    }}>
                    {...themes.map(createThemeButton)}
                </UICallout>
            )}
        </>
    );
}

/**
 * Set theme.
 *
 * @param themeName - ThemeName
 */
export function setThemeOnDocument(themeName: ThemeName): void {
    document.getElementsByTagName('HTML')[0].setAttribute('data-theme', themeName);
}
