import { jest } from '@jest/globals';

const mockExistsSync = jest.fn();
const mockReaddirSync = jest.fn();

const realFs = await import('node:fs');
jest.unstable_mockModule('node:fs', () => ({
    ...realFs,
    existsSync: mockExistsSync,
    readdirSync: mockReaddirSync
}));

const realAdpTooling = await import('@sap-ux/adp-tooling');
jest.unstable_mockModule('@sap-ux/adp-tooling', () => ({
    ...realAdpTooling,
    validateUI5VersionExists: jest.fn().mockResolvedValue(true)
}));

const { getDefaultNamespace, getDefaultProjectName, getDefaultVersion } =
    await import('../../../../src/app/questions/helper/default-values');

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
        mockExistsSync.mockReturnValueOnce(true).mockReturnValueOnce(false);

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
