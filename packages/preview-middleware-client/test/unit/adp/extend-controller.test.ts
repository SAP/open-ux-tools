import { initExtendControllerPlugin } from '../../../src/adp/extend-controller';
import type UI5Element from 'sap/ui/core/Element';
import CommandFactory from 'sap/ui/rta/command/CommandFactory';
import ExtendControllerPlugin from 'sap/ui/rta/plugin/ExtendControllerPlugin';
import { DialogFactory, DialogNames } from '../../../src/adp/dialog-factory';
import { createDeferred } from '../../../src/adp/utils';
import type { RTAOptions } from 'sap/ui/rta/RuntimeAuthoring';
import RuntimeAuthoringMock from 'mock/sap/ui/rta/RuntimeAuthoring';

jest.mock('sap/ui/rta/command/CommandFactory');
jest.mock('sap/ui/rta/plugin/ExtendControllerPlugin');
jest.mock('../../../src/adp/dialog-factory');
jest.mock('../../../src/adp/utils', () => ({
    createDeferred: jest.fn()
}));

describe('AddFragmentService', () => {
    const mockRta = new RuntimeAuthoringMock({} as RTAOptions);
    let mockOverlay: jest.Mocked<UI5Element>;

    beforeEach(() => {
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
            const createDeferredMock = (createDeferred as jest.Mock);
            createDeferredMock.mockReturnValue(mockDeferred);
            jest.spyOn(DialogFactory, 'createDialog').mockResolvedValue(undefined);

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