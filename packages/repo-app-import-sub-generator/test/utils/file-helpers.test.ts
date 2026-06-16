import { jest } from '@jest/globals';
import type { Editor } from 'mem-fs-editor';
import { t } from '../../src/utils/i18n.js';
import { join } from 'node:path';
import { PromptState } from '../../src/prompts/prompt-state.js';

jest.mock('adm-zip');

jest.unstable_mockModule('../../src/utils/logger', () => {
    const mock = {
        logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() },
        configureLogging: jest.fn()
    };
    return { default: mock, ...mock };
});

const { readManifest, makeValidJson, addPackageJsonIfNotFound, processDebugArtifacts } =
    await import('../../src/utils/file-helpers.js');
const RepoAppDownloadLogger = (await import('../../src/utils/logger.js')).default;

describe('readManifest', () => {
    const mockReadJSON = jest.fn();
    const mockFs = { readJSON: mockReadJSON, exists: jest.fn() } as unknown as Editor;
    const extractedProjectPath = 'project-path';

    afterEach(() => {
        jest.clearAllMocks();
        jest.restoreAllMocks();
    });

    it('should return manifest when valid manifest is read', async () => {
        const validManifest = {
            'sap.app': {
                id: 'test-app'
            }
        };
        mockReadJSON.mockReturnValue(validManifest);
        const manifestFilePath = join(extractedProjectPath, 'manifest.json');
        const result = readManifest(manifestFilePath, mockFs);
        expect(result).toBe(validManifest);
        expect(mockFs.readJSON).toHaveBeenCalledWith(manifestFilePath);
    });

    it('should throw an error if manifest is not found', async () => {
        mockReadJSON.mockReturnValue(null);
        readManifest(extractedProjectPath, mockFs);
        expect(RepoAppDownloadLogger.logger.error).toHaveBeenCalledWith(
            t('error.readManifestErrors.readManifestFailed')
        );
    });

    it('should throw an error if "sap.app" is not defined in the manifest', async () => {
        const invalidManifestNoSapApp = {
            // No 'sap.app' field
        };
        // Mock fs readJSON function to return a manifest without 'sap.app'
        mockReadJSON.mockReturnValue(invalidManifestNoSapApp);
        readManifest(extractedProjectPath, mockFs);
        expect(RepoAppDownloadLogger.logger.error).toHaveBeenCalledWith(t('error.readManifestErrors.sapAppNotDefined'));
    });
});

describe('makeValidJson', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should throw an error when file contents are not valid JSON', () => {
        const mockFs = { read: jest.fn().mockReturnValue('not valid json') } as unknown as Editor;
        expect(() => makeValidJson('some/path/qfa.json', mockFs)).toThrow(
            t('error.errorProcessingJsonFile', { error: expect.anything() })
        );
    });
});

describe('processDebugArtifacts', () => {
    const mockFs = {
        exists: jest.fn(),
        delete: jest.fn(),
        write: jest.fn()
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should copy -dbg.js content to corresponding .js file and delete debug file', () => {
        const dbgContent = 'unminified content';
        const entries = [{ entryName: 'Component-dbg.js', getData: jest.fn(() => Buffer.from(dbgContent)) }];
        const mockAdmZip = { getEntries: jest.fn(() => entries) };
        (PromptState as any)['_admZipInstance'] = mockAdmZip;

        processDebugArtifacts('/webapp', mockFs as any);

        expect(mockFs.write).toHaveBeenCalledWith(join('/webapp', 'Component.js'), dbgContent);
        expect(mockFs.delete).toHaveBeenCalledWith(join('/webapp', 'Component-dbg.js'));
    });

    it('should delete preload and source map files', () => {
        const entries = [
            { entryName: 'Component-preload.js' },
            { entryName: 'Component.js.map' },
            { entryName: 'Component.js' }
        ];
        const mockAdmZip = { getEntries: jest.fn(() => entries) };
        (PromptState as any)['_admZipInstance'] = mockAdmZip;
        mockFs.exists.mockReturnValue(true);

        processDebugArtifacts('/webapp', mockFs as any);

        expect(mockFs.delete).toHaveBeenCalledWith(join('/webapp', 'Component-preload.js'));
        expect(mockFs.delete).toHaveBeenCalledWith(join('/webapp', 'Component.js.map'));
        expect(mockFs.delete).not.toHaveBeenCalledWith(join('/webapp', 'Component.js'));
    });

    it('should not delete preload or map file if it does not exist in mem-fs', () => {
        const entries = [{ entryName: 'Component-preload.js' }];
        const mockAdmZip = { getEntries: jest.fn(() => entries) };
        (PromptState as any)['_admZipInstance'] = mockAdmZip;
        mockFs.exists.mockReturnValue(false);

        processDebugArtifacts('/webapp', mockFs as any);

        expect(mockFs.delete).not.toHaveBeenCalled();
    });

    it('should do nothing when admZip is not set', () => {
        PromptState.reset();

        processDebugArtifacts('/webapp', mockFs as any);

        expect(mockFs.delete).not.toHaveBeenCalled();
        expect(mockFs.write).not.toHaveBeenCalled();
    });
});

describe('addPackageJsonIfNotFound', () => {
    const mockFs = {
        exists: jest.fn(),
        writeJSON: jest.fn()
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should write package.json when it does not exist', () => {
        mockFs.exists.mockReturnValue(false);

        addPackageJsonIfNotFound('/project', 'my.app.id', mockFs as unknown as Editor);

        expect(mockFs.writeJSON).toHaveBeenCalledWith(join('/project', 'package.json'), { name: 'my.app.id' });
    });

    it('should not write package.json when it already exists', () => {
        mockFs.exists.mockReturnValue(true);

        addPackageJsonIfNotFound('/project', 'my.app.id', mockFs as unknown as Editor);

        expect(mockFs.writeJSON).not.toHaveBeenCalled();
    });
});
