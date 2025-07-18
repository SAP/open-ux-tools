import { initAddXMLPlugin } from '../../../src/adp/add-fragment';
import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';
import type UI5Element from 'sap/ui/core/Element';
import CommandFactory from 'mock/sap/ui/rta/command/CommandFactory';
import AddXMLPlugin from 'mock/sap/ui/rta/plugin/AddXMLPlugin';
import { DialogFactory, DialogNames } from '../../../src/adp/dialog-factory';
import { createDeferred } from '../../../src/adp/utils';

jest.mock('../../../src/adp/dialog-factory');
jest.mock('../../../src/adp/utils', () => ({
    createDeferred: jest.fn()
}));

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
            (createDeferred as jest.Mock).mockReturnValue(mockDeferred);
            (DialogFactory.createDialog as jest.Mock).mockResolvedValue(undefined);

            const result = await fragmentHandler(mockOverlay);

            expect(createDeferred).toHaveBeenCalledWith();
            expect(DialogFactory.createDialog).toHaveBeenCalledWith(
                mockOverlay,
                mockRta,
                DialogNames.ADD_FRAGMENT,
                { deferred: mockDeferred }
            );
            expect(result).toEqual('mockDeferredData');
        });
    });
});