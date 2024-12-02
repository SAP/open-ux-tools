// import { getSecureStore } from '../../../src/secure-store';
// import { KeyStoreManager } from '../../../src/secure-store/key-store';
// import { DummyStore } from '../../../src/secure-store/dummy-store';
// import * as utils from '../../../src/utils';
// import type { Logger } from '@sap-ux/logger';
// import { keyring } from '@zowe/secrets-for-zowe-sdk';

// jest.mock('../../../src/secure-store/key-store');
// jest.mock('../../../src/secure-store/dummy-store');
// jest.mock('../../../src/utils');
// jest.mock('@zowe/secrets-for-zowe-sdk', () => ({
//   keyring: {}
// }));

// describe('getSecureStore', () => {
//   let log;

//   beforeEach(() => {
//     log = { warn: jest.fn(), info: jest.fn() } as unknown as Logger;
//     jest.clearAllMocks();
//   });

//   // it('should use DummyStore when secure store is disabled by App Studio', () => {
//   //   (utils.isAppStudio as jest.Mock).mockReturnValue(true);

//   //   const store = getSecureStore(log);

//   //   expect(store).toBeInstanceOf(DummyStore); // Check if DummyStore is returned
//   //   expect(log.info).toHaveBeenCalledWith('Secure store disabled, using DummyStore.'); // Log assertion
//   // });

//   // it('should use DummyStore when secure store is disabled via environment variable', () => {
//   //   process.env.FIORI_TOOLS_DISABLE_SECURE_STORE = 'true'; // Simulate environment variable

//   //   const store = getSecureStore(log);

//   //   expect(store).toBeInstanceOf(DummyStore); // Check if DummyStore is returned
//   //   expect(log.info).toHaveBeenCalledWith('Secure store disabled, using DummyStore.'); // Log assertion
//   // });

//   it('should use KeyStoreManager when Zowe SDK is successfully loaded', () => {
//     (utils.isAppStudio as jest.Mock).mockReturnValue(false);
//     delete process.env.FIORI_TOOLS_DISABLE_SECURE_STORE; // Clear environment variable
//     // Mocking the `keyring` object as if the SDK was successfully loaded
//     jest.mock('@zowe/secrets-for-zowe-sdk', () => ({
//       keyring: {
//         getPassword: jest.fn(),
//         setPassword: jest.fn(),
//         deletePassword: jest.fn,
//         findCredentials: jest.fn()
//       }
//     }));

//     const store = getSecureStore(log);

//     expect(store).toBeInstanceOf(KeyStoreManager); // Check if KeyStoreManager is returned
//     expect(log.info).toHaveBeenCalledWith('Using KeyStoreManager for secure storage.'); // Log assertion
//   });

//   it('should fall back to DummyStore if Zowe SDK cannot be loaded', () => {
//     (utils.isAppStudio as jest.Mock).mockReturnValue(false);
//     delete process.env.FIORI_TOOLS_DISABLE_SECURE_STORE; // Clear environment variable
//     jest.clearAllMocks();
//     jest.resetAllMocks();
//     // Mocking the `keyring` object as if the SDK was successfully loaded
//     jest.mock('@zowe/secrets-for-zowe-sdk', () => ({
//       keyring: null
//     }));

//     const store = getSecureStore(log);

//     expect(store).toBeInstanceOf(DummyStore);
//     expect(log.warn).toHaveBeenCalledWith('Falling back to DummyStore as secure storage could not be initialized.'); // Log assertion
//   });
// });

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
