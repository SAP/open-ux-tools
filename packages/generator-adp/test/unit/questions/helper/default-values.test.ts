import { existsSync } from 'node:fs';

import {
    getDefaultNamespace,
    getDefaultProjectName,
    getDefaultVersion
} from '../../../../src/app/questions/helper/default-values';

jest.mock('fs', () => ({
    ...jest.requireActual('fs'),
    readdirSync: jest.fn(),
    existsSync: jest.fn()
}));

jest.mock('@sap-ux/adp-tooling', () => ({
    ...jest.requireActual('@sap-ux/adp-tooling'),
    validateUI5VersionExists: jest.fn().mockResolvedValue(true)
}));

const existsSyncMock = existsSync as jest.Mock;

describe('generateValidNamespace', () => {
    const projectName = 'app.variant1';
    it('should prepend "customer." when layer is CUSTOMER_BASE', () => {
        const namespace = getDefaultNamespace(projectName, true);
        expect(namespace).toBe(`customer.${projectName}`);
    });

    it('should return projectName unchanged when layer is not CUSTOMER_BASE', () => {
        const namespace = getDefaultNamespace(projectName, false);
        expect(namespace).toBe(projectName);
    });
});

describe('getDefaultProjectName', () => {
    const testPath = 'home/projects';

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should return "app.variant1" if no matching project directories exist', () => {
        existsSyncMock.mockReturnValueOnce(true).mockReturnValueOnce(false);

        const defaultName = getDefaultProjectName(testPath);

        expect(defaultName).toBe('app.variant2');
    });
});

describe('getVersionDefaultValue', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should return empty string if no ui5 versions passed', async () => {
        const defaultVersion = await getDefaultVersion([]);

        expect(defaultVersion).toBe('');
    });

    it('should return validate the first version passed and return it', async () => {
        const defaultVersion = await getDefaultVersion(['1.134.1', '1.133.0']);

        expect(defaultVersion).toBe('1.134.1');
    });
});
