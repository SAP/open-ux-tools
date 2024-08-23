import Controller from 'mock/sap/ui/core/mvc/Controller';
import rtaMock from 'mock/sap/ui/rta/RuntimeAuthoring';
import type UI5Element from 'sap/ui/core/Element';
import * as utils from '../../../src/adp/utils';
import ExtensionPoint from '../../../src/adp/controllers/ExtensionPoint.controller';
import ExtensionPointService, { type ExtensionPointInfo } from '../../../src/adp/extension-point';

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

            const createDeferredMock = jest.fn().mockReturnValue({
                promise: new Promise((resolve) => {
                    resolve(true);
                }),
                resolve: mockResolve,
                reject: mockReject
            }) as jest.Mock;

            ExtensionPoint.prototype.setup = jest.fn();

            jest.spyOn(utils, 'createDeferred').mockImplementation(createDeferredMock);

            const result = await service.fragmentHandler(
                {} as UI5Element,
                [{ name: 'some-extension-point' }] as ExtensionPointInfo[]
            );

            expect(result).toBe(true);
        });
    });
});
