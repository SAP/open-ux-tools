import { sapMock } from 'mock/window';
import ManagedObjectMock from 'mock/sap/ui/base/ManagedObject';
import { getLibrary, getRuntimeControl, isA, isManagedObject } from '../../../src/cpe/utils';

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
    afterEach(() => {
        sapMock.ui.require.mockReset();
    });
    test('getLibrary - valid library', async () => {
        const mockCtrl = {
            getMetadata: jest.fn().mockReturnValue({
                getLibraryName: jest.fn().mockReturnValue('sap.m')
            })
        };
        const promise = getLibrary('sap.m.Button');
        const callBk = sapMock.ui.require.mock.calls[0][1];
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
        const callBk = sapMock.ui.require.mock.calls[0][1];
        if (callBk) {
            callBk(mockCtrl);
        }
        const result = await promise;
        expect(result).toBe('');
    });
});

describe('isManagedObject', () => {
    test('empty object', () => {
        expect(isManagedObject({})).toBe(false);
    });

    test('does not implement isA', () => {
        expect(isManagedObject({ isA: 5 })).toBe(false);
    });

    test('isA checks for "sap.ui.base.ManagedObject" ', () => {
        expect(isManagedObject({ isA: (type: string) => type === 'sap.ui.base.ManagedObject' })).toBe(true);
    });
});

describe('isA', () => {
    test('calls "isA" on ManagedObject', () => {
        const managedObject = new ManagedObjectMock();
        const spy = jest.spyOn(managedObject, 'isA').mockImplementation((type: string | string[]) => {
            return type === 'sap.ui.base.ManagedObject';
        });
        expect(isA('sap.ui.base.ManagedObject', managedObject)).toBe(true);
        expect(spy).toHaveBeenCalledWith('sap.ui.base.ManagedObject');
    });
});
