import { localDatetimeToUTC } from '../../src/base/utils/date';

localDatetimeToUTC();

describe('Test util.date', () => {
    test('Test localDatetimeToUTC()', () => {
        const dateTime: string = localDatetimeToUTC();
        expect(dateTime.length).toEqual(24);
    });
});
