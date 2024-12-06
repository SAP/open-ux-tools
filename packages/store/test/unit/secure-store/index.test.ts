import * as appStudioUtils from '../../../src/utils/app-studio';
import { getSecureStore } from '../../../src/secure-store';
import { DummyStore } from '../../../src/secure-store/dummy-store';
import { KeyStoreManager } from '../../../src/secure-store/key-store';
import { ToolsLogger, NullTransport } from '@sap-ux/logger';
import { readdirSync, existsSync } from 'fs';
import { join } from 'path';
jest.mock('fs', () => ({
    ...jest.requireActual('fs'),
    existsSync: jest.fn(),
    readdirSync: jest.fn()
}));

jest.mock('os', () => ({
    ...jest.requireActual('os'),
    homedir: () => 'test_dir'
}));

describe('getSecureStore', () => {
    beforeEach(() => jest.resetAllMocks());

    const nullLogger = new ToolsLogger({ transports: [new NullTransport()] });

    it('returns an instance of DummyStore on App Studio', () => {
        jest.spyOn(appStudioUtils, 'isAppStudio').mockReturnValueOnce(true);
        expect(getSecureStore(nullLogger)).toBeInstanceOf(DummyStore);
    });

    describe('non App Studio', () => {
        beforeEach(() => {
            jest.resetModules();
            jest.restoreAllMocks();
            jest.resetAllMocks();
            jest.spyOn(appStudioUtils, 'isAppStudio').mockReturnValue(false);
        });
        it('returns KeyStoreManager if zowe sdk is made available with no errors', () => {
            jest.mock('@zowe/secrets-for-zowe-sdk', jest.fn());
            expect(getSecureStore(nullLogger)).toBeInstanceOf(DummyStore);
        });

        it('returns zowe sdk from application modeler', () => {
            jest.mock('@zowe/secrets-for-zowe-sdk', () => {
                throw new Error();
            });

            const readdirSyncMock = readdirSync as jest.Mock;

            readdirSyncMock.mockReturnValue(['sapse.sap-ux-application-modeler-extension-1.14.1']);
            const existsSyncSyncMock = existsSync as jest.Mock;

            existsSyncSyncMock.mockReturnValue(true);

            jest.mock(
                join(
                    `test_dir/.vscode/extensions/sapse.sap-ux-application-modeler-extension-1.14.1/node_modules/@zowe/secrets-for-zowe-sdk`
                ),
                () => '@zowe/secrets-for-zowe-sdk',
                { virtual: true }
            );

            expect(getSecureStore(nullLogger)).toBeInstanceOf(KeyStoreManager);
        });
        it('returns DummyStore if @zowe/secrets-for-zowe-sdk & vscode cannot be required', () => {
            jest.mock(
                '@zowe/secrets-for-zowe-sdk',
                () => {
                    throw new Error();
                },
                { virtual: true }
            );
            jest.mock(
                'vscode',
                () => {
                    throw new Error();
                },
                { virtual: true }
            );
            jest.mock(
                `vscode_app_root/node_modules.asar/@zowe/secrets-for-zowe-sdk`,
                () => '@zowe/secrets-for-zowe-sdk',
                { virtual: true }
            );
            expect(getSecureStore(nullLogger)).toBeInstanceOf(DummyStore);
        });

        it('returns DummyStore if `${vscode?.env} is not set', () => {
            jest.mock('@zowe/secrets-for-zowe-sdk', () => {
                throw new Error();
            });
            const vscode = {
                env: undefined
            };
            jest.mock('vscode', () => vscode, { virtual: true });
            expect(getSecureStore(nullLogger)).toBeInstanceOf(DummyStore);
        });
        it('returns DummyStore if @zowe/secrets-for-zowe-sdk is not undefined', () => {
            jest.mock('@zowe/secrets-for-zowe-sdk', () => {
                throw new Error();
            });
            jest.mock('vscode', () => undefined, { virtual: true });
            const os = {
                homeDir: 'test_dir'
            };
            jest.mock('os', () => os, { virtual: true });

            const glob = {
                globSync: ['test_dir/.vscode/extensions/no-app-modeler']
            };
            jest.mock('glob', () => glob, { virtual: true });
            expect(getSecureStore(nullLogger)).toBeInstanceOf(DummyStore);
        });
        it('returns DummyStore if environment variable FIORI_TOOLS_DISABLE_SECURE_STORE is set', () => {
            process.env.FIORI_TOOLS_DISABLE_SECURE_STORE = 'true';
            expect(getSecureStore(nullLogger)).toBeInstanceOf(DummyStore);
            delete process.env.FIORI_TOOLS_DISABLE_SECURE_STORE;
        });
        it('returns DummyStore when all else fails', () => {
            jest.mock('@zowe/secrets-for-zowe-sdk', () => {
                throw new Error();
            });
            const vscode = {
                env: { appRoot: 'vscode_app_root' }
            };
            jest.mock('vscode', () => vscode, { virtual: true });
            const os = {
                homeDir: 'test_dir'
            };
            jest.mock('os', () => os, { virtual: true });

            const glob = {
                globSync: ['test_dir/.vscode/extensions/no-app-modeler']
            };
            jest.mock('glob', () => glob, { virtual: true });
            jest.mock(
                `vscode_app_root/node_modules.asar/@zowe/secrets-for-zowe-sdk`,
                () => {
                    throw new Error();
                },
                { virtual: true }
            );
            jest.mock(
                `vscode_app_root/node_modules/@zowe/secrets-for-zowe-sdk`,
                () => {
                    throw new Error();
                },
                { virtual: true }
            );
            expect(getSecureStore(nullLogger)).toBeInstanceOf(DummyStore);
        });
    });
});
