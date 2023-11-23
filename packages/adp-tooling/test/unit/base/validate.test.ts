import UI5Validator from '../../../src/base/validate';
import { UI5Config } from '@sap-ux/ui5-config';
import * as projectAccessMock from '@sap-ux/project-access';
import { join } from 'path';
import { readFileSync } from 'fs';

describe('base/validate', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('valid validateUi5Yaml', async () => {
        const validUi5 = readFileSync(join(__dirname, '../../fixtures/yaml', 'valid.yaml'), 'utf-8');
        jest.spyOn(projectAccessMock, 'readUi5Yaml').mockResolvedValueOnce(UI5Config.newInstance(validUi5));
        await UI5Validator.validateUi5Yaml('sample-path');
    });

    test('invalidvalid validateUi5Yaml', async () => {
        const invalidUi5 = readFileSync(join(__dirname, '../../fixtures/yaml', 'invalid.yaml'), 'utf-8');
        jest.spyOn(projectAccessMock, 'readUi5Yaml').mockResolvedValueOnce(UI5Config.newInstance(invalidUi5));
        try {
            await UI5Validator.validateUi5Yaml('sample-path');
        } catch (error) {
            expect(error.message).toEqual(Error('Missing environment in the ui5 yaml file'));
        }
    });
});
