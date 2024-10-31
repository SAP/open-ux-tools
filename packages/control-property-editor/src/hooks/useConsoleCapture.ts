import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';

import { LogType, removeDateFromMessage } from '../utils/console-filtration';

interface IframeConsoleCaptureOptions {
    filter?: (type: LogType, args: any[]) => boolean;
}

/**
 * Custom hook to capture and filter console messages from an iframe.
 *
 * @param {React.RefObject<HTMLIFrameElement>} iframeRef - A reference to the iframe element whose console should be captured.
 * @param {IframeConsoleCaptureOptions} [options] - Optional configuration object for the console capture.
 * @param {Function} [options.filter] - A filter function to determine which console messages to capture. Should return `true` to capture a message or `false` to ignore it.
 *
 * @returns {void} This hook does not return anything. It sets up and cleans up the console capture logic.
 *
 * @example
 * const iframeRef = useRef<HTMLIFrameElement>(null);
 * useConsoleCapture(iframeRef, {
 *   filter: (type, args) => !args.join(' ').includes('ignore-this'),
 * });
 */
export const useConsoleCapture = (
    iframeRef: React.RefObject<HTMLIFrameElement>,
    options?: IframeConsoleCaptureOptions
): void => {
    const dispatch = useDispatch();
    const [logs, setLogs] = useState<string[]>([]);

    console.log('Amount of logs', JSON.stringify(logs, null, 2));

    useEffect(() => {
        const iframe = iframeRef.current;

        if (iframe && iframe.contentWindow) {
            const iframeWindow = iframe.contentWindow as Window & { console: Console };

            const originalConsoleLog = iframeWindow.console.log;
            const originalConsoleWarn = iframeWindow.console.warn;
            const originalConsoleError = iframeWindow.console.error;

            const handleIframeLog = (type: LogType, args: any[]) => {
                const message = args.map((arg) => (typeof arg === 'string' ? arg : JSON.stringify(arg))).join(' ');

                if (options?.filter && !options.filter(type, args)) {
                    return;
                }

                const clearMsg = removeDateFromMessage(message);

                setLogs((prev) => [...prev, clearMsg]);

                // TODO: Dispatch an action to the Redux store
                // dispatch(
                //     addIframeLog({
                //         type,
                //         message
                //     })
                // );
            };

            iframeWindow.console.log = (...args: any[]) => {
                handleIframeLog('log', args);

                originalConsoleLog.apply(iframeWindow.console, args);
            };

            iframeWindow.console.warn = (...args: any[]) => {
                handleIframeLog('warn', args);

                originalConsoleWarn.apply(iframeWindow.console, args);
            };

            iframeWindow.console.error = (...args: any[]) => {
                handleIframeLog('error', args);

                originalConsoleError.apply(iframeWindow.console, args);
            };

            return () => {
                iframeWindow.console.log = originalConsoleLog;
                iframeWindow.console.warn = originalConsoleWarn;
                iframeWindow.console.error = originalConsoleError;
            };
        }
    }, [iframeRef, dispatch, options]);
};
