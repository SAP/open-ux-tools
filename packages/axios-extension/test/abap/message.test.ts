import type { ErrorMessage, SuccessMessage } from '../../src';
import { prettyPrintError, prettyPrintMessage, prettyPrintTimeInMs } from '../../src';
import { ToolsLogger } from '@sap-ux/logger';

describe('message helpers', () => {
    const log = new ToolsLogger();
    const host = 'http://host.example';
    const logDebugMock = (log.debug = jest.fn());
    const logWarningMock = (log.warn = jest.fn());

    describe('prettyPrintMessage', () => {
        test('convert JSON into messages', () => {
            const isDest = false;
            const msg: SuccessMessage = {
                code: '200',
                message: '~message',
                'longtext_url': '/abc/de',
                details: [
                    { code: '1', message: '~message', severity: 'info' },
                    { code: '2', message: '~message', severity: 'warning' },
                    { code: '3', message: '~message', severity: 'success' }
                ]
            };
            prettyPrintMessage({ msg: JSON.stringify(msg), log, host, isDest });
            // Check if log.debug is called at least once (no matter how often)
            expect(logDebugMock).toHaveBeenCalled();
            expect(logWarningMock).toHaveBeenCalledTimes(1);
        });
        test('log note when URL contains .dest', () => {
            // Simulate a specific baseURL that contains ".dest"
            const config = {
                baseURL: 'CCF_715.dest/sap/bc/adt/ato/settings'
            };
            const msg: SuccessMessage = {
                code: '200',
                message: '~message',
                'longtext_url': 'CCF_715.dest/sap/bc/adt/ato/settings',
                details: [
                    { code: '1', message: '~message', severity: 'info' },
                    { code: '2', message: '~message', severity: 'warning' }
                ]
            };
            prettyPrintMessage({ msg: JSON.stringify(msg), log, host, isDest: /\.dest\//.test(config.baseURL) });
            expect(logDebugMock).toHaveBeenCalled();
            // Check if log.debug is called with the note about .dest
            expect(logDebugMock).toHaveBeenCalledWith(
                '(Note: You will need to replace the host in the URL with the internal host, if your destination is configured using an On-Premise SAP Cloud Connector)'
            );
        });

        test('log none JSON message for debugging', () => {
            const msg = '<xml>~message</xml>';
            const debugMock = (log.debug = jest.fn());
            prettyPrintMessage({ msg, log, host });
            expect(debugMock).toBeCalledWith(msg);
        });
    });

    test('prettyPrintError', () => {
        const error: ErrorMessage = {
            code: '500',
            message: {
                value: '~message'
            },
            innererror: {
                transactionid: '~id',
                timestamp: '~time',
                'Error_Resolution': {
                    abc: '~message',
                    def: '~message'
                },
                errordetails: [
                    {
                        code: '1',
                        message: '~message',
                        severity: 'error',
                        longtext_url: '~longtext_url'
                    },
                    { code: '2', message: '~message', severity: 'error' }
                ]
            }
        };
        const errorMock = (log.error = jest.fn());
        const infoMock = (log.debug = jest.fn());
        prettyPrintError({ error, log, host, isDest: true });
        // log message, each resolution and each error detail
        expect(errorMock).toBeCalledTimes(
            1 + Object.keys(error.innererror.Error_Resolution).length + error.innererror.errordetails.length
        );
        expect(infoMock).toBeCalledTimes(3);

        // Restrict to only errordetails, typical for deployment with test mode enabled
        errorMock.mockReset();
        infoMock.mockReset();
        prettyPrintError({ error, log, host }, false);
        expect(errorMock).toBeCalledTimes(Object.keys(error.innererror.Error_Resolution).length);
        expect(infoMock).toBeCalledTimes(2);
        expect(infoMock).toHaveBeenLastCalledWith(expect.stringMatching('http://host.example/~longtext_url'));

        delete error.message;
        delete error.innererror;
        errorMock.mockReset();
        infoMock.mockReset();
        prettyPrintError({ error, log, host });
        expect(errorMock).toBeCalledTimes(1);
        expect(infoMock).toBeCalledTimes(0);
    });

    test('prettyPrintTimeInMs', () => {
        // time in seconds
        expect(prettyPrintTimeInMs(7.5 * 1000)).toBe('7.5 seconds');
        // exactly one minute
        expect(prettyPrintTimeInMs(60 * 1000)).toBe('1 minute');
        // more than a minute rounded down
        expect(prettyPrintTimeInMs(13 * 60 * 1000 + 123)).toBe('13 minutes');
    });
});
