import { localDatetimeToUTC } from '../../src/base/utils/date.js';

localDatetimeToUTC();

describe('Test util.date', () => {
    test('Test localDatetimeToUTC()', () => {
        const dateTime: string = localDatetimeToUTC();
        expect(dateTime.length).toEqual(24);
    });
});
