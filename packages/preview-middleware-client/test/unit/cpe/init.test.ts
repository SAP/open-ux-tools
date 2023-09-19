import log from 'mock/sap/base/Log';
import init from '../../../src/cpe/init';
import rtaMock from 'mock/sap/ui/rta/RuntimeAuthoring';

describe('cpe', () => {
    test('init', () => {
        init(rtaMock);
        expect(log.debug).toBeCalled();
    });
});