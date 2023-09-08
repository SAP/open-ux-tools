import { getLibrary, getRuntimeControl } from '../../src/cpe/utils';

describe('getRuntimeControl', () => {
    let overlayControl: any;
    let getElementInstanceMock: jest.Mock;
    let getElementMock: jest.Mock;
    beforeEach(() => {
        getElementInstanceMock = jest.fn();
        getElementMock = jest.fn();
    });
    afterEach(() => {
        jest.resetAllMocks();
    });

    test('getRuntimeControl - getElementInstance', () => {
        // prepare
        overlayControl = {
            getElementInstance: getElementInstanceMock.mockReturnValue('mockManagedObject')
        };

        //result
        const result = getRuntimeControl(overlayControl);

        //assert
        expect(getElementInstanceMock).toBeCalledTimes(1);
        expect(result).toBe('mockManagedObject');
    });

    test('getRuntimeControl - getElement', () => {
        // prepare
        overlayControl = {
            getElement: getElementMock.mockReturnValue('mockManagedObject')
        };

        //result
        const result = getRuntimeControl(overlayControl);

        //assert
        expect(getElementMock).toBeCalledTimes(1);
        expect(result).toBe('mockManagedObject');
    });
});
describe('getLibrary', () => {
    let requireSpy: jest.SpyInstance;
    beforeEach(() => {
        requireSpy = jest.spyOn(sap.ui, 'require');
    });

    afterEach(() => {
        requireSpy.mockReset();
    });
    test('getLibrary - valid library', async () => {
        const mockCtrl = {
            getMetadata: jest.fn().mockReturnValue({
                getLibraryName: jest.fn().mockReturnValue('sap.m')
            })
        };
        const promise = getLibrary('sap.m.Button');
        const callBk = requireSpy.mock.calls[0][1];
        if (callBk) {
            callBk(mockCtrl);
        }
        const result = await promise;
        expect(result).toBe('sap.m');
    });

    test('getLibrary - invalid library', async () => {
        const mockCtrl = {
            getMetadata: jest.fn().mockReturnValue(undefined)
        };
        const promise = getLibrary('random.lib.Control');
        const callBk = requireSpy.mock.calls[0][1];
        if (callBk) {
            callBk(mockCtrl);
        }
        const result = await promise;
        expect(result).toBe('');
    });
});
