import type { Theme } from '@fluentui/react';
import { createTheme, loadTheme } from '@fluentui/react';

/**
 * Method intializes default styles for 'ui-components' theme.
 */
export function initTheme(): void {
    const appTheme: Theme = createTheme({
        defaultFontStyle: {
            WebkitFontSmoothing: ''
        }
    });

    loadTheme(appTheme);
}
