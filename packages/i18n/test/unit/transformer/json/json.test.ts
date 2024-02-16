import { jsonToI18nBundle } from '../../../../src';

describe('json', () => {
    describe('jsonToI18nBundle', () => {
        test('key string value', () => {
            // arrange
            const content = `
                {
                    "": {
                        "App1": "App 1",
                        "Key": "App Layer"
                    }
                }
            `;
            // act
            const result = jsonToI18nBundle(content, 'absolute/file/path');
            // assert
            expect(result).toMatchSnapshot();
        });
        test('key number value', () => {
            // arrange
            const content = `
                {
                    "": {
                        "App1": 1
                    }
                }
            `;
            // act
            const result = jsonToI18nBundle(content, 'absolute/file/path');
            // assert
            expect(result).toMatchSnapshot();
        });
        test('key boolean value', () => {
            // arrange
            const content = `
                {
                    "": {
                        "i18nSupport": true
                    }
                }
            `;
            // act
            const result = jsonToI18nBundle(content, 'absolute/file/path');
            // assert
            expect(result).toMatchSnapshot();
        });
        test('key null value', () => {
            // arrange
            const content = `
                {
                    "": {
                        "i18nSupport": null
                    }
                }
            `;
            // act
            const result = jsonToI18nBundle(content, 'absolute/file/path');
            // assert
            expect(result).toMatchSnapshot();
        });
    });
});
