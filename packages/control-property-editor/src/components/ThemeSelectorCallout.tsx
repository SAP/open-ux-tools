import { UIIconButton, UICallout, UIFocusZone } from '@sap-ux/ui-components';
import type { ReactElement } from 'react';
import React, { useRef, useState } from 'react';
import { useId } from '@fluentui/react-hooks';
import { useTranslation } from 'react-i18next';

import './ThemeSelectorCallout.scss';
import { IconName } from '../icons';
import { useTheme } from '../use-theme';
import type { ThemeName } from '../use-theme';

/**
 * React element for theme selector.
 *
 * @returns ReactElement
 */
export function ThemeSelectorCallout(): ReactElement {
    const { t } = useTranslation();
    const [isCalloutVisible, setValue] = useState(false);
    const [theme, setTheme] = useTheme();
    const buttonId = useId('callout-button');
    const initialFocusRoot = useRef<HTMLElement | null>(null);
    interface ThemeButtonProps {
        name: ThemeName;
        tooltip: string;
    }
    const themes: ThemeButtonProps[] = [
        {
            name: 'light modern',
            tooltip: 'LIGHT_THEME_NAME'
        },
        {
            name: 'dark modern',
            tooltip: 'DARK_THEME_NAME'
        },
        {
            name: 'high contrast black',
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
        const isCurrentTheme = theme === name;
        return (
            <div
                data-is-focusable={true}
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
                    setTheme(name);
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
                    iconName: IconName.themePainter
                }}
                title={t('SETTINGS')}
                onClick={(): void => {
                    setValue(!isCalloutVisible);
                }}
            />
            {isCalloutVisible && (
                <UICallout
                    id={'themes-selector'}
                    data-testid={'theme-selector-callout'}
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
                    setInitialFocus={true}
                    focusTargetSiblingOnTabPress={true}
                    onDismiss={(): void => {
                        setValue(false);
                    }}>
                    <UIFocusZone
                        defaultTabbableElement={(root: HTMLElement) => {
                            initialFocusRoot.current = root.querySelector('.theme-child.selected');
                            return initialFocusRoot.current ?? root;
                        }}
                        onActiveElementChanged={() => {
                            if (initialFocusRoot.current) {
                                initialFocusRoot.current.focus();
                                initialFocusRoot.current = null;
                            }
                        }}>
                        {...themes.map(createThemeButton)}
                    </UIFocusZone>
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
