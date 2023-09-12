import log from 'mock/sap/base/Log';
import init from '../../../src/adp/init';
import rtaMock from 'mock/sap/ui/rta/RuntimeAuthoring';

describe('adp', () => {
    test('init', () => {
        init(rtaMock);
        expect(log.debug).toBeCalledTimes(2);
    });
});