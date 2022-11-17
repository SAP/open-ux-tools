import * as appStudioUtils from '../../../src/utils/app-studio';
import { getSecureStore } from '../../../src/secure-store';
import { DummyStore } from '../../../src/secure-store/dummy-store';
import { KeytarStore } from '../../../src/secure-store/keytar-store';
import { ToolsLogger, NullTransport } from '@sap-ux/logger';

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
        it('returns KeytarStore if keytar can be required with no errors', () => {
            jest.mock('keytar', jest.fn());
            expect(getSecureStore(nullLogger)).toBeInstanceOf(DummyStore);
        });
        it('returns DummyStore if keytar & vscode cannot be required', () => {
            jest.mock(
                'keytar',
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
            jest.mock(`vscode_app_root/node_modules.asar/keytar`, () => 'keytar', { virtual: true });
            expect(getSecureStore(nullLogger)).toBeInstanceOf(DummyStore);
        });
        it('returns KeytarStore if `${vscode?.env?.appRoot}/node_modules.asar/keytar` can be required with no errors', () => {
            jest.mock('keytar', () => {
                throw new Error();
            });
            const vscode = {
                env: { appRoot: 'vscode_app_root' }
            };
            jest.mock('vscode', () => vscode, { virtual: true });
            jest.mock(`vscode_app_root/node_modules.asar/keytar`, () => 'keytar', { virtual: true });
            expect(getSecureStore(nullLogger)).toBeInstanceOf(KeytarStore);
        });
        it('returns KeytarStore if `${vscode?.env?.appRoot}/node_modules/keytar` can be required with no errors', () => {
            jest.mock('keytar', () => {
                throw new Error();
            });
            const vscode = {
                env: { appRoot: 'vscode_app_root' }
            };
            jest.mock('vscode', () => vscode, { virtual: true });
            jest.mock(
                `vscode_app_root/node_modules.asar/keytar`,
                () => {
                    throw new Error();
                },
                { virtual: true }
            );
            jest.mock(`vscode_app_root/node_modules/keytar`, () => 'keytar', { virtual: true });
            expect(getSecureStore(nullLogger)).toBeInstanceOf(KeytarStore);
        });
        it('returns DummyStore if `${vscode?.env} is not set', () => {
            jest.mock('keytar', () => {
                throw new Error();
            });
            const vscode = {
                env: undefined
            };
            jest.mock('vscode', () => vscode, { virtual: true });
            expect(getSecureStore(nullLogger)).toBeInstanceOf(DummyStore);
        });
        it('returns DummyStore if vscode is not undefined', () => {
            jest.mock('keytar', () => {
                throw new Error();
            });
            jest.mock('vscode', () => undefined, { virtual: true });
            expect(getSecureStore(nullLogger)).toBeInstanceOf(DummyStore);
        });
        it('returns DummyStore when all else fails', () => {
            jest.mock('keytar', () => {
                throw new Error();
            });
            const vscode = {
                env: { appRoot: 'vscode_app_root' }
            };
            jest.mock('vscode', () => vscode, { virtual: true });
            jest.mock(
                `vscode_app_root/node_modules.asar/keytar`,
                () => {
                    throw new Error();
                },
                { virtual: true }
            );
            jest.mock(
                `vscode_app_root/node_modules/keytar`,
                () => {
                    throw new Error();
                },
                { virtual: true }
            );
            expect(getSecureStore(nullLogger)).toBeInstanceOf(DummyStore);
        });
    });
});
