import { csvToI18nBundle } from '../../../../src/index.js';

describe('csv', () => {
    test('csvToI18nBundle', () => {
        // arrange
        const content = `
            key;en;de
            Book;Book;Buch
            Books;Books;Bücher
        `;
        // act
        const result = csvToI18nBundle(content, 'absolute/file/path');
        // assert
        expect(result).toMatchSnapshot();
    });
});
