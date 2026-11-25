import { jest } from '@jest/globals';
import type { ToolsLogger } from '@sap-ux/logger';
import type { CfConfig, CfServiceInstanceChoice } from '@sap-ux/adp-tooling';

const mockGetAdpServiceInstances = jest.fn<typeof realAdpTooling.getAdpServiceInstances>();
const mockGetModuleNames = jest.fn<typeof realAdpTooling.getModuleNames>();
const mockHasApprouter = jest.fn<typeof realAdpTooling.hasApprouter>();
const mockValidateProjectPath = jest.fn<typeof realValidators.validateProjectPath>();
const mockValidateMtaId = jest.fn<typeof realValidators.validateMtaId>();
const mockRealpathSync = jest.fn<(typeof realFs.realpathSync)['native']>();

const realFs = await import('node:fs');
jest.unstable_mockModule('node:fs', () => ({
    ...realFs,
    default: { ...realFs, realpathSync: mockRealpathSync },
    realpathSync: mockRealpathSync
}));

const realAdpTooling = await import('@sap-ux/adp-tooling');
jest.unstable_mockModule('@sap-ux/adp-tooling', () => ({
    ...realAdpTooling,
    getAdpServiceInstances: mockGetAdpServiceInstances,
    getModuleNames: mockGetModuleNames,
    hasApprouter: mockHasApprouter
}));

const realValidators = await import('../../../../src/app/questions/helper/validators.js');
jest.unstable_mockModule('../../../../src/app/questions/helper/validators', () => ({
    ...realValidators,
    validateProjectPath: mockValidateProjectPath,
    validateMtaId: mockValidateMtaId
}));

const { initI18n, t } = await import('../../../../src/utils/i18n.js');
const { MtaMode } = await import('../../../../src/app/types.js');
const { resolveCfProjectPath, hasExistingApprouter, resolveCfServiceInstance } =
    await import('../../../../src/app/headless/cf.js');

const logger = { info: jest.fn(), error: jest.fn(), log: jest.fn() } as unknown as ToolsLogger;
const cfConfig = { space: { GUID: 'space-guid' } } as unknown as CfConfig;

beforeAll(async () => {
    await initI18n();
});

beforeEach(() => {
    jest.clearAllMocks();
    mockValidateProjectPath.mockReturnValue(true);
    mockValidateMtaId.mockReturnValue(true);
});

describe('resolveCfProjectPath', () => {
    it('should join targetFolder and mtaId for a new MTA', () => {
        const result = resolveCfProjectPath(MtaMode.New, '/parent', logger, cfConfig, 'my-mta');
        expect(result).toContain('my-mta');
        expect(mockValidateMtaId).toHaveBeenCalledWith('my-mta', '/parent');
    });

    it('should throw when a new MTA has no mtaId', () => {
        expect(() => resolveCfProjectPath(MtaMode.New, '/parent', logger, cfConfig)).toThrow(t('error.mtaIdRequired'));
    });

    it('should resolve the real path of targetFolder for an existing MTA', () => {
        mockRealpathSync.mockReturnValue('/resolved/mta');
        const result = resolveCfProjectPath(MtaMode.Existing, '/mta', logger, cfConfig);
        expect(result).toBe('/resolved/mta');
    });

    it('should throw when project-path validation fails', () => {
        mockValidateProjectPath.mockReturnValue('bad path');
        expect(() => resolveCfProjectPath(MtaMode.Existing, '/mta', logger, cfConfig)).toThrow('bad path');
    });
});

describe('hasExistingApprouter', () => {
    it('should return false for a new MTA without reading modules', () => {
        expect(hasExistingApprouter(MtaMode.New, '/parent')).toBe(false);
        expect(mockGetModuleNames).not.toHaveBeenCalled();
    });

    it('should return true when an existing MTA declares an approuter', () => {
        mockGetModuleNames.mockReturnValue(['app-destination-content']);
        mockHasApprouter.mockReturnValue(true);
        expect(hasExistingApprouter(MtaMode.Existing, '/mta')).toBe(true);
    });

    it('should return false when the mta.yaml cannot be read', () => {
        mockGetModuleNames.mockImplementation(() => {
            throw new Error('no yaml');
        });
        expect(hasExistingApprouter(MtaMode.Existing, '/mta')).toBe(false);
    });
});

describe('resolveCfServiceInstance', () => {
    const instances = [
        { name: 'live-instance', guid: 'g1' },
        { name: 'other', guid: 'g2' }
    ] as unknown as CfServiceInstanceChoice[];

    it('should return the instance matching the name', async () => {
        mockGetAdpServiceInstances.mockResolvedValue(instances);
        const result = await resolveCfServiceInstance('live-instance', cfConfig, logger);
        expect(result).toEqual({ name: 'live-instance', guid: 'g1' });
        expect(mockGetAdpServiceInstances).toHaveBeenCalledWith('space-guid', logger);
    });

    it('should throw when no instance matches the name', async () => {
        mockGetAdpServiceInstances.mockResolvedValue(instances);
        await expect(resolveCfServiceInstance('missing', cfConfig, logger)).rejects.toThrow(
            t('error.serviceInstanceNotFound', { name: 'missing' })
        );
    });
});
