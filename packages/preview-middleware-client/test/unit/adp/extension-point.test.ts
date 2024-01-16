import Controller from 'mock/sap/ui/core/mvc/Controller';
import rtaMock from 'mock/sap/ui/rta/RuntimeAuthoring';
import type UI5Element from 'sap/ui/core/Element';

import ExtensionPointService from '../../../src/adp/extension-point';
import { type ExtensionPointData } from '../../../src/adp/extension';
import * as utils from '../../../src/adp/utils';

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

            jest.spyOn(utils, 'createDeferred').mockImplementation(createDeferredMock);

            const result = await service.fragmentHandler(
                {} as UI5Element,
                [{ name: 'some-extension-point' }] as ExtensionPointData[]
            );

            expect(result).toBe(true);
        });
    });
});
