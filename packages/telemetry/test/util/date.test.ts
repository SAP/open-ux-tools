import { localDatetimeToUTC } from '../../src/util/date';

localDatetimeToUTC();

describe('Test util.date', () => {
    test('Test localDatetimeToUTC()', () => {
        const dateTime: string = localDatetimeToUTC();
        expect(dateTime.length).toEqual(24);
    });
});
