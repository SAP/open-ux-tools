import type { Theme } from '@fluentui/react';
import { createTheme, loadTheme } from '@fluentui/react';

export function initTheme(): void {
    const appTheme: Theme = createTheme({
        defaultFontStyle: {
            WebkitFontSmoothing: ''
        }
    });

    loadTheme(appTheme);
}
