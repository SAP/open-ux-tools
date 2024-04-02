import { getFormattedDateAndTime } from '../../../../src/panels/changes/utils';

describe('getFormattedDateAndTime', () => {
    let navigatorSpy: jest.SpyInstance;
    jest.spyOn(navigator, 'languages', 'get').mockReturnValue([]);
    beforeEach(() => {
        navigatorSpy = jest.spyOn(navigator, 'language', 'get');
    });
    afterEach(() => {
        jest.resetAllMocks();
    });

    test('should format timestamp correctly in default locale', () => {
        const timestamp = Date.parse('2023-10-01T12:34:56');
        navigatorSpy.mockReturnValue('en-US');
        const result = getFormattedDateAndTime(timestamp);
        expect(result).toBe('12:34 01/10/23');
    });

    test('should format timestamp correctly in supported locale', () => {
        const timestamp = Date.parse('2023-10-01T12:34:56');
        navigatorSpy.mockReturnValue('fr-FR');
        const result = getFormattedDateAndTime(timestamp);
        expect(result).toBe('12:34 01/10/23');
    });

    test('should format timestamp correctly when navigator is not defined', () => {
        const timestamp = Date.parse('2023-10-01T12:34:56');
        navigatorSpy.mockReturnValue('');
        const result = getFormattedDateAndTime(timestamp);
        expect(result).toBe('12:34 01/10/23');
    });

    test('should fall back to default locale if no supported locales found', () => {
        const timestamp = Date.parse('2023-10-01T12:34:56');
        navigatorSpy.mockReturnValue('xx-YY');
        const result = getFormattedDateAndTime(timestamp);
        expect(result).toBe('12:34 01/10/23');
    });
});
