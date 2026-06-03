import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';
import type UI5Element from 'sap/ui/core/Element';
import CommandFactory from 'mock/sap/ui/rta/command/CommandFactory';
import AddXMLPlugin from 'mock/sap/ui/rta/plugin/AddXMLPlugin';

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

const { initAddXMLPlugin } = await import('open/ux/preview/client/adp/add-fragment');

describe('AddFragmentService', () => {
    let mockRta: jest.Mocked<RuntimeAuthoring>;
    let mockOverlay: jest.Mocked<UI5Element>;

    beforeEach(() => {
        mockRta = {
            getFlexSettings: jest.fn().mockReturnValue({}),
            getPlugins: jest.fn().mockReturnValue({}),
            setPlugins: jest.fn()
        } as unknown as jest.Mocked<RuntimeAuthoring>;

        mockOverlay = {} as jest.Mocked<UI5Element>;

        jest.clearAllMocks();
    });

    describe('init', () => {
        it('should initialize the AddXMLPlugin and set it in RTA plugins', async () => {
            initAddXMLPlugin(mockRta);

            expect(AddXMLPlugin).toHaveBeenCalledWith({
                commandFactory: expect.any(CommandFactory),
                fragmentHandler: expect.any(Function)
            });

            // Test the fragmentHandler function
            const fragmentHandler = (AddXMLPlugin as jest.Mock).mock.calls[0][0].fragmentHandler;
            const mockDeferred = { promise: Promise.resolve('mockDeferredData') };
            createDeferredMock.mockReturnValue(mockDeferred);
            createDialogMock.mockResolvedValue(undefined);

            const result = await fragmentHandler(mockOverlay);

            expect(createDeferredMock).toHaveBeenCalledWith();
            expect(createDialogMock).toHaveBeenCalledWith(
                mockOverlay,
                mockRta,
                'ADD_FRAGMENT',
                { deferred: mockDeferred }
            );
            expect(result).toEqual('mockDeferredData');
        });
    });
});
