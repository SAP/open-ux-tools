import { jsonToI18nBundle } from '../../../../src';

describe('json', () => {
    test('jsonToI18nBundle', () => {
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
});
