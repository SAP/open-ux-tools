import { getFormattedDateAndTime } from '../../../../../src/app/panels/changes/utils';

describe('getFormattedDateAndTime', () => {
    afterEach(() => {
        jest.resetAllMocks();
    });

    test('should format timestamp correctly in default locale', () => {
        const timestamp = Date.parse('2023-10-01T12:34:56');
        jest.spyOn(global.navigator, 'languages', 'get').mockImplementation(() => ['en-US']);
        const result = getFormattedDateAndTime(timestamp);
        expect(result).toBe('12:34 10/01/23');
    });

    test('should format timestamp correctly in supported locale', () => {
        const timestamp = Date.parse('2023-10-01T12:34:56');
        jest.spyOn(global.navigator, 'languages', 'get').mockImplementation(() => ['fr-FR']);
        const result = getFormattedDateAndTime(timestamp);
        expect(result).toBe('12:34 01/10/23');
    });

    test('should format timestamp correctly when navigator is not defined', () => {
        const timestamp = Date.parse('2023-10-01T12:34:56');
        jest.spyOn(global, 'navigator', 'get').mockImplementation((): any => ({}));
        const result = getFormattedDateAndTime(timestamp);
        expect(result).toBe('12:34 01/10/23');
    });

    test('should fall back to default locale if no supported locales found', () => {
        const timestamp = Date.parse('2023-10-01T12:34:56');
        jest.spyOn(global.navigator, 'languages', 'get').mockImplementation(() => ['xx-YY']);
        const result = getFormattedDateAndTime(timestamp);
        expect(result).toBe('12:34 01/10/23');
    });
});
