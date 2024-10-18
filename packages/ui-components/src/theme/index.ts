import { createTheme, loadTheme, Theme } from '@fluentui/react';

export function initTheme(): void {
    const appTheme: Theme = createTheme({
        defaultFontStyle: {
            WebkitFontSmoothing: ''
        }
    });

    loadTheme(appTheme);
}
