import { useState, useEffect } from 'react';

import { debounce } from '@sap-ux-private/control-property-editor-common';

export interface WindowSize {
    width: number | undefined;
    height: number | undefined;
}

/**
 * Gets state of window size.
 *
 * @returns WindowSize
 */
export function useWindowSize(): WindowSize {
    const [windowSize, setWindowSize] = useState<WindowSize>({
        width: undefined,
        height: undefined
    });

    useEffect(() => {
        const handleResize = debounce(() => {
            setWindowSize({
                width: window.innerWidth,
                height: window.innerHeight
            });
        }, 500);

        window.addEventListener('resize', handleResize);

        setWindowSize({
            width: window.innerWidth,
            height: window.innerHeight
        });

        return (): void => window.removeEventListener('resize', handleResize);
    }, []);
    return windowSize;
}
