import type React from 'react';
import { useEffect } from 'react';
import { useLocalStorage } from './use-local-storage';

export type ThemeName = 'dark modern' | 'light modern' | 'high contrast black';
/**
 * React hook that lets you read and update applications theme.
 *
 * @returns [theme, setTheme] [T, React.Dispatch<T>]
 */
export function useTheme(): [ThemeName, React.Dispatch<ThemeName>] {
    const [theme, setTheme] = useLocalStorage<ThemeName>('theme', 'dark modern');

    useEffect(() => {
        document.getElementsByTagName('HTML')[0].setAttribute('data-theme', theme);
    }, [theme]);

    return [theme, setTheme];
}
