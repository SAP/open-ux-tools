import Controller from 'mock/sap/ui/core/mvc/Controller';
import rtaMock from 'mock/sap/ui/rta/RuntimeAuthoring';
import type UI5Element from 'sap/ui/core/Element';

const createDeferredMock = jest.fn();
jest.unstable_mockModule('open/ux/preview/client/adp/utils', () => ({
    createDeferred: createDeferredMock,
    checkForExistingChange: jest.fn(),
    getNestedProperty: jest.fn(),
    matchesChangeProperty: jest.fn(),
    getControllerInfoForControl: jest.fn(),
    getControllerInfo: jest.fn(),
    getReuseComponentChecker: jest.fn(),
    resetReuseComponentChecker: jest.fn()
}));

import ExtensionPoint from '../../../src/adp/controllers/ExtensionPoint.controller';
const { default: ExtensionPointService } = await import('open/ux/preview/client/adp/extension-point');
type ExtensionPointInfo = import('../../../src/adp/extension-point').ExtensionPointInfo;

describe('ExtensionPointService', () => {
    describe('fragmentHandler', () => {
        beforeEach(() => {
            Controller.create.mockResolvedValue({ overlays: {}, rta: {} });
        });

        afterEach(() => {
            jest.restoreAllMocks();
        });

        test('should return deferred promise', async () => {
            const service = new ExtensionPointService(rtaMock);

            const mockResolve = jest.fn();
            const mockReject = jest.fn();

            createDeferredMock.mockReturnValue({
                promise: new Promise((resolve) => {
                    resolve(true);
                }),
                resolve: mockResolve,
                reject: mockReject
            });

            ExtensionPoint.prototype.setup = jest.fn();

            const result = await service.fragmentHandler(
                {} as UI5Element,
                [{ name: 'some-extension-point' }] as ExtensionPointInfo[]
            );

            expect(result).toBe(true);
        });
    });
});
