import express from 'express';
import supertest from 'supertest';
import * as reloadMiddleware from '../../../src/ui5/middleware';
import type { MiddlewareConfig } from '../../../src/types';
import { ToolsLogger } from '@sap-ux/logger';
import { FileWatcher } from '../../../src/base';
import type { Data } from 'ws';
import { WebSocket } from 'ws';
import type { RequestHandler } from 'express';

jest.mock('../../../src/base/watcher', () => {
    return {
        __esModule: true,
        FileWatcher: jest.fn()
    };
});

async function getReloadMiddleware(
    fixture?: string,
    configuration: Partial<MiddlewareConfig> = {}
): Promise<RequestHandler> {
    return await (reloadMiddleware as any).default({
        options: { configuration },
        resources: {},
        middlewareUtil: {
            getProject: jest.fn().mockReturnValue({
                getRootPath: jest.fn().mockReturnValue('testRoot')
            })
        }
    });
}

// middleware function wrapper for testing to simplify tests
async function getTestServer(
    fixture?: string,
    configuration: Partial<MiddlewareConfig> = {},
    port?: number
): Promise<any> {
    const mw = await getReloadMiddleware(fixture, configuration);
    const app = express();
    app.use(mw);
    if (port) {
        app.listen(port);
    }
    return supertest(app);
}

describe('ui5/middleware', () => {
    afterEach(() => jest.clearAllMocks());

    test('reload-middleware', async () => {
        // Arrange
        function waitForEvent(event: () => boolean, timeout?: number) {
            let loops = 0;
            const waiter = (event: () => boolean) => {
                loops++;
                return new Promise<void>((resolve, reject) => {
                    setTimeout(() => {
                        if (event()) {
                            resolve();
                        } else if (timeout && timeout < loops * 5) {
                            reject();
                        } else {
                            waiter(event).then(resolve).catch(reject);
                        }
                    }, 5);
                });
            };
            return waiter(event);
        }

        let watcherRoot;
        let watcherCallBack: undefined | ((changedFiles: string[]) => void);
        let receivedMessage: Data | undefined;

        (FileWatcher as jest.MockedClass<typeof FileWatcher>).mockImplementation(
            (path: string, callBack: (changedFiles: string[]) => void): FileWatcher => {
                watcherRoot = path;
                watcherCallBack = callBack;
                return {} as FileWatcher;
            }
        );
        const logInfoSpy = jest.spyOn(ToolsLogger.prototype, 'info');

        // Act
        await getTestServer('test', {}, 3000);
        const ws = new WebSocket('ws://localhost:3000');
        ws.addEventListener('message', (event) => {
            receivedMessage = event.data;
        });
        await waitForEvent(() => ws.readyState === WebSocket.OPEN);

        // Simulate file event
        if (watcherCallBack) {
            watcherCallBack(['testFileUri1', 'testFileUri2']);
        }

        ws.close();
        await waitForEvent(() => ws.readyState === WebSocket.CLOSED);
        await waitForEvent(() => !!receivedMessage, 3000);

        // Assert
        expect(watcherRoot).toBe('testRoot/webapp');
        expect(receivedMessage).toMatchInlineSnapshot(`"testFileUri1,testFileUri2"`);
        expect(logInfoSpy.mock.calls.map((call) => call[0])).toMatchInlineSnapshot(`
            Array [
              "Websocket client connected",
              "File changes detected: testFileUri1
            testFileUri2",
              "Websocket client disconnected",
            ]
        `);
    });

    test('Middleware creation exception', async () => {
        (FileWatcher as jest.MockedClass<typeof FileWatcher>).mockImplementation((): FileWatcher => {
            throw new Error('File watcher test error');
        });

        await expect(getTestServer('test')).rejects.toThrowError('File watcher test error');
    });
});
