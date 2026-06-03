import type UI5Element from 'sap/ui/core/Element';
import mockCommandFactory from 'mock/sap/ui/rta/command/CommandFactory';
import ExtendControllerPlugin from 'mock/sap/ui/rta/plugin/ExtendControllerPlugin';
import type { RTAOptions } from 'sap/ui/rta/RuntimeAuthoring';
import RuntimeAuthoringMock from 'mock/sap/ui/rta/RuntimeAuthoring';

const createDeferredMock = jest.fn();
jest.unstable_mockModule('open/ux/preview/client/adp/utils', () => ({
    createDeferred: createDeferredMock
}));

const createDialogMock = jest.fn();
jest.unstable_mockModule('open/ux/preview/client/adp/dialog-factory', () => ({
    DialogFactory: { createDialog: createDialogMock },
    DialogNames: {
        ADD_FRAGMENT: 'ADD_FRAGMENT',
        ADD_FRAGMENT_AT_EXTENSION_POINT: 'ADD_FRAGMENT_AT_EXTENSION_POINT',
        CONTROLLER_EXTENSION: 'CONTROLLER_EXTENSION',
        ADD_TABLE_COLUMN_FRAGMENTS: 'ADD_TABLE_COLUMN_FRAGMENTS',
        CHANGE_DATA_SOURCE: 'CHANGE_DATA_SOURCE',
        ADD_COMPONENT_USAGES: 'ADD_COMPONENT_USAGES'
    }
}));

const { initExtendControllerPlugin } = await import('open/ux/preview/client/adp/extend-controller');

describe('AddFragmentService', () => {
    const mockRta = new RuntimeAuthoringMock({} as RTAOptions);
    let mockOverlay: jest.Mocked<UI5Element>;

    beforeEach(() => {
        mockOverlay = {} as jest.Mocked<UI5Element>;

        jest.clearAllMocks();
    });

    describe('init', () => {
        it('should initialize the ExtendControllerPlugin and set it in RTA plugins', async () => {
            mockRta.getPlugins = jest.fn().mockReturnValue({});

            initExtendControllerPlugin(mockRta);

            expect(ExtendControllerPlugin).toHaveBeenCalledWith({
                commandFactory: expect.any(mockCommandFactory),
                handlerFunction: expect.any(Function)
            });

            // Test the handler function
            const handlerFunction = (ExtendControllerPlugin as jest.Mock).mock.calls[0][0].handlerFunction;
            const mockDeferred = { promise: Promise.resolve('mockDeferredData') };
            createDeferredMock.mockReturnValue(mockDeferred);
            createDialogMock.mockResolvedValue(undefined);

            const result = await handlerFunction(mockOverlay);

            expect(createDeferredMock).toHaveBeenCalledWith();
            expect(createDialogMock).toHaveBeenCalledWith(
                mockOverlay,
                mockRta,
                'CONTROLLER_EXTENSION',
                { deferred: mockDeferred }
            );
            expect(result).toEqual('mockDeferredData');
        });
    });
});
