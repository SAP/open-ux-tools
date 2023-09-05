import { loadReuseLibs } from '../../src/flp/libs';
import Log from 'sap/base/Log';

const mockInfo = Log.info as jest.Mock;

describe('initPlugin', () => {
    test('logger is called', () => {
        loadReuseLibs();
        expect(mockInfo).toBeCalled();
    });
});
