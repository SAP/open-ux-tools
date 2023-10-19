import Controller from 'mock/sap/ui/core/mvc/Controller';
// import rtaMock from 'mock/sap/ui/rta/RuntimeAuthoring';
// import type UI5Element from 'sap/ui/core/Element';

// import ExtensionPointService, { type ExtensionPointData } from '../../../src/adp/extension-point';

describe('ExtensionPointService', () => {
    describe('fragmentHandler', () => {
        beforeEach(() => {
            Controller.create.mockResolvedValue({ overlays: {}, rta: {} });
        });

        test('should', async () => {
            // const service = new ExtensionPointService(rtaMock);

            // jest.mock('createDeferred')

            // const result = await service.fragmentHandler(
            //     {} as UI5Element,
            //     { name: 'some-extension-point' } as ExtensionPointData
            // );

            // expect(result)
        });
    });
});
