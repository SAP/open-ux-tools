import { initExtendControllerPlugin } from '../../../src/adp/extend-controller';
import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';
import type UI5Element from 'sap/ui/core/Element';
import CommandFactory from 'sap/ui/rta/command/CommandFactory';
import ExtendControllerPlugin from 'sap/ui/rta/plugin/ExtendControllerPlugin';
import { DialogFactory, DialogNames } from '../../../src/adp/dialog-factory';
import { createDeferred } from '../../../src/adp/utils';

jest.mock('sap/ui/rta/command/CommandFactory');
jest.mock('sap/ui/rta/plugin/ExtendControllerPlugin');
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
        it('should initialize the ExtendControllerPlugin and set it in RTA plugins', async () => {
            const mockCommandFactory = jest.fn();
            (CommandFactory as unknown as jest.Mock).mockImplementation(() => mockCommandFactory);

            initExtendControllerPlugin(mockRta);

            expect(ExtendControllerPlugin).toHaveBeenCalledWith({
                commandFactory: mockCommandFactory,
                handlerFunction: expect.any(Function)
            });

            // Test the handler function
            const handlerFunction = (ExtendControllerPlugin as jest.Mock).mock.calls[0][0].handlerFunction;
            const mockDeferred = { promise: Promise.resolve('mockDeferredData') };
            (createDeferred as jest.Mock).mockReturnValue(mockDeferred);
            (DialogFactory.createDialog as jest.Mock).mockResolvedValue(undefined);

            const result = await handlerFunction(mockOverlay);

            expect(createDeferred).toHaveBeenCalledWith();
            expect(DialogFactory.createDialog).toHaveBeenCalledWith(
                mockOverlay,
                mockRta,
                DialogNames.CONTROLLER_EXTENSION,
                { deferred: mockDeferred }
            );
            expect(result).toEqual('mockDeferredData');
        });
    });
});