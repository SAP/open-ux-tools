import { jest } from '@jest/globals';
import type { Editor } from 'mem-fs-editor';
import { t } from '../../src/utils/i18n';
import { adtSourceTemplateId } from '../../src/utils/constants';
import { join } from 'node:path';

jest.unstable_mockModule('../../src/utils/logger', () => {
    const mock = {
        logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() },
        configureLogging: jest.fn()
    };
    return { default: mock, ...mock };
});

const { readManifest } = await import('../../src/utils/file-helpers');
const RepoAppDownloadLogger = (await import('../../src/utils/logger')).default;

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
                id: 'test-app',
                sourceTemplate: {
                    id: adtSourceTemplateId
                }
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

    it('should throw an error if the sourceTemplate.id is not supported', async () => {
        const invalidManifestWrongTemplate = {
            'sap.app': {
                id: 'test-app',
                sourceTemplate: {
                    id: 'wrong-template-id'
                }
            }
        };
        // Mock fs readJSON function to return a manifest with an unsupported sourceTemplate.id
        mockReadJSON.mockReturnValue(invalidManifestWrongTemplate);
        readManifest(extractedProjectPath, mockFs);
        expect(RepoAppDownloadLogger.logger.error).toHaveBeenCalledWith(
            t('error.readManifestErrors.sourceTemplateNotSupported')
        );
    });
});
