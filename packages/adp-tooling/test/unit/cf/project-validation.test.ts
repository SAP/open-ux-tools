import { jest } from '@jest/globals';
import type { ToolsLogger } from '@sap-ux/logger';
import type { CfConfig } from '../../../src/types.js';

const realFs = await import('node:fs');
const mockExistsSync = jest.fn<typeof realFs.existsSync>();
jest.unstable_mockModule('node:fs', () => ({
    ...realFs,
    default: { ...realFs.default, existsSync: mockExistsSync },
    existsSync: mockExistsSync
}));
const realYaml = await import('../../../src/cf/project/yaml.js');
const mockIsMtaProject = jest.fn<typeof realYaml.isMtaProject>();
const mockGetCfProjectSpaceGuid = jest.fn<typeof realYaml.getCfProjectSpaceGuid>();
jest.unstable_mockModule('../../../src/cf/project/yaml', () => ({
    ...realYaml,
    isMtaProject: mockIsMtaProject,
    getCfProjectSpaceGuid: mockGetCfProjectSpaceGuid
}));
const { validateProjectPath, validateMtaId, validateBusinessSolutionName } =
    await import('../../../src/cf/project-validation.js');
const { initI18n, t } = await import('../../../src/i18n.js');
const MtaMode = { New: 'new', Existing: 'existing' } as const;
const { initI18nProjectValidators } = await import('@sap-ux/project-input-validator');

beforeAll(async () => {
    await initI18nProjectValidators();
});

describe('validateProjectPath', () => {
    const mockLogger = {
        error: jest.fn()
    } as unknown as ToolsLogger;

    beforeAll(async () => {
        await initI18n();
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should return true for valid existing MTA project', async () => {
        mockExistsSync.mockReturnValue(true);
        mockIsMtaProject.mockReturnValue(true);

        const result = await validateProjectPath('/test/project', mockLogger);
        expect(result).toBe(true);
    });

    test('should return error for empty string', async () => {
        const result = await validateProjectPath('', mockLogger);
        expect(result).toBe('The input cannot be empty.');
    });

    test('should return error when project does not exist', async () => {
        mockExistsSync.mockReturnValue(false);

        const result = await validateProjectPath('/nonexistent/project', mockLogger);
        expect(result).toBe(t('error.projectDoesNotExist'));
    });

    test('should return error when existing mode path is not an MTA project', async () => {
        mockExistsSync.mockReturnValue(true);
        mockIsMtaProject.mockReturnValue(false);

        const result = await validateProjectPath('/test/project', mockLogger);
        expect(result).toBe(t('error.projectDoesNotExistMta'));
    });

    test('should accept an existing MTA project even without a declared service', async () => {
        mockExistsSync.mockReturnValue(true);
        mockIsMtaProject.mockReturnValue(true);

        const result = await validateProjectPath('/test/project', mockLogger, MtaMode.Existing);
        expect(result).toBe(true);
    });

    test('should accept a non-MTA parent folder in new mode', async () => {
        mockExistsSync.mockReturnValue(true);
        mockIsMtaProject.mockReturnValue(false);

        const result = await validateProjectPath('/parent/folder', mockLogger, MtaMode.New);
        expect(result).toBe(true);
        expect(mockGetCfProjectSpaceGuid).not.toHaveBeenCalled();
    });

    test('should return an error in new mode when the selected folder is already an MTA project', async () => {
        mockExistsSync.mockReturnValue(true);
        mockIsMtaProject.mockReturnValue(true);

        const result = await validateProjectPath('/existing-mta', mockLogger, MtaMode.New);
        expect(result).toBe(t('error.newModeFolderAlreadyMta'));
    });

    test('should return an error when the MTA belongs to a different CF space', async () => {
        mockExistsSync.mockReturnValue(true);
        mockIsMtaProject.mockReturnValue(true);
        mockGetCfProjectSpaceGuid.mockReturnValue('space-guid-1');
        const cfConfig = { space: { GUID: 'space-guid-2', Name: 'space-2' } } as unknown as CfConfig;

        const result = await validateProjectPath('/test/project', mockLogger, MtaMode.Existing, cfConfig);
        expect(result).toBe(t('error.projectSpaceMismatch'));
    });

    test('should accept the MTA when its space matches the current login', async () => {
        mockExistsSync.mockReturnValue(true);
        mockIsMtaProject.mockReturnValue(true);
        mockGetCfProjectSpaceGuid.mockReturnValue('space-guid-1');
        const cfConfig = { space: { GUID: 'space-guid-1', Name: 'space-1' } } as unknown as CfConfig;

        const result = await validateProjectPath('/test/project', mockLogger, MtaMode.Existing, cfConfig);
        expect(result).toBe(true);
    });

    test('should accept the MTA when its space is unknown (non-CF project)', async () => {
        mockExistsSync.mockReturnValue(true);
        mockIsMtaProject.mockReturnValue(true);
        mockGetCfProjectSpaceGuid.mockReturnValue(undefined);
        const cfConfig = { space: { GUID: 'space-guid-2', Name: 'space-2' } } as unknown as CfConfig;

        const result = await validateProjectPath('/test/project', mockLogger, MtaMode.Existing, cfConfig);
        expect(result).toBe(true);
    });
});

describe('validateMtaId', () => {
    beforeAll(async () => {
        await initI18n();
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should return error for empty string', () => {
        const result = validateMtaId('');
        expect(result).toBe('The input cannot be empty.');
    });

    test('should return true for a valid name', () => {
        mockExistsSync.mockReturnValue(false);
        expect(validateMtaId('my.mta_project-1')).toBe(true);
    });

    test('should return error for a name longer than 20 characters', () => {
        expect(validateMtaId('a'.repeat(21))).toBe(t('error.mtaIdTooLong'));
    });

    test('should return true for a name of exactly 20 characters', () => {
        mockExistsSync.mockReturnValue(false);
        expect(validateMtaId('a'.repeat(20))).toBe(true);
    });

    test('should return error for a name with invalid characters', () => {
        expect(validateMtaId('my project')).toBe(t('error.mtaIdInvalid'));
    });

    test('should return error for a name that does not start with a letter or number', () => {
        expect(validateMtaId('-invalid')).toBe(t('error.mtaIdInvalid'));
    });

    test('should return error when a folder with the name already exists in the parent location', () => {
        mockExistsSync.mockReturnValue(true);

        const result = validateMtaId('my-mta', '/parent');
        expect(result).toBe(t('error.mtaIdAlreadyExists'));
    });

    test('should return true when no folder collision exists at the parent location', () => {
        mockExistsSync.mockReturnValue(false);

        const result = validateMtaId('my-mta', '/parent');
        expect(result).toBe(true);
    });
});

describe('validateBusinessSolutionName', () => {
    beforeAll(async () => {
        await initI18n();
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should return true for valid name with dot separator', () => {
        const result = validateBusinessSolutionName('test.solution');
        expect(result).toBe(true);
    });

    test('should return true for multi-segment name', () => {
        const result = validateBusinessSolutionName('com.sap.test');
        expect(result).toBe(true);
    });

    test('should return true for single segment name', () => {
        const result = validateBusinessSolutionName('test');
        expect(result).toBe(true);
    });

    test('should return true for name with underscores', () => {
        const result = validateBusinessSolutionName('my_solution');
        expect(result).toBe(true);
    });

    test('should return true for name with hyphens', () => {
        const result = validateBusinessSolutionName('my-solution');
        expect(result).toBe(true);
    });

    test('should return true for name with mixed valid characters', () => {
        const result = validateBusinessSolutionName('my-app_v2.config');
        expect(result).toBe(true);
    });

    test('should return error for empty string', () => {
        const result = validateBusinessSolutionName('');
        expect(result).toBe('The input cannot be empty.');
    });

    test('should return error for name with spaces', () => {
        const result = validateBusinessSolutionName('test solution');
        expect(result).toBe(t('error.businessSolutionNameInvalid'));
    });

    test('should return error for name with special characters', () => {
        const result = validateBusinessSolutionName('test.sol@tion');
        expect(result).toBe(t('error.businessSolutionNameInvalid'));
    });

    test('should return error for name with uppercase letters', () => {
        const result = validateBusinessSolutionName('Test.Solution');
        expect(result).toBe(t('error.businessSolutionNameInvalid'));
    });

    test('should return error for name with only dots and special chars', () => {
        const result = validateBusinessSolutionName('..._');
        expect(result).toBe(t('error.businessSolutionNameInvalid'));
    });

    test('should return error for name wich starts with special character', () => {
        let result = validateBusinessSolutionName('_abc');
        expect(result).toBe(t('error.businessSolutionNameInvalid'));
        result = validateBusinessSolutionName('.abc');
        expect(result).toBe(t('error.businessSolutionNameInvalid'));
    });
});
