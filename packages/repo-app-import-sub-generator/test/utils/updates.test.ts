import { jest } from '@jest/globals';
import type { Editor } from 'mem-fs-editor';
import { t } from '../../src/utils/i18n';
import { join } from 'node:path';
import { fioriAppSourcetemplateId } from '../../src/utils/constants';

import type { Manifest } from '@sap-ux/project-access';

// Inline project-access constants to avoid loading full dependency chain
const FileName = { Manifest: 'manifest.json' } as const;
const DirName = { Webapp: 'webapp' } as const;

// Pre-import actual modules before mocking
const actualUi5Info = await import('@sap-ux/ui5-info');
const actualFeatureToggle = await import('@sap-ux/feature-toggle');
const actualFileHelpers = await import('../../src/utils/file-helpers');

const mockGetUI5Versions = jest.fn();
const mockIsInternalFeaturesSettingEnabled = jest.fn();
const mockReadManifest = jest.fn();

jest.unstable_mockModule('@sap-ux/ui5-info', () => ({
    ...actualUi5Info,
    getUI5Versions: mockGetUI5Versions
}));

jest.unstable_mockModule('@sap-ux/feature-toggle', () => ({
    ...actualFeatureToggle,
    isInternalFeaturesSettingEnabled: mockIsInternalFeaturesSettingEnabled
}));

jest.unstable_mockModule('../../src/utils/file-helpers', () => ({
    ...actualFileHelpers,
    readManifest: mockReadManifest
}));

jest.unstable_mockModule('../../src/utils/logger', () => {
    const mock = {
        logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() },
        configureLogging: jest.fn()
    };
    return { default: mock, ...mock };
});

const { validateAndUpdateManifestUI5Version, replaceWebappFiles } = await import('../../src/utils/updates');
const RepoAppDownloadLogger = (await import('../../src/utils/logger')).default;

describe('validateAndUpdateManifestUI5Version', () => {
    let fs: {
        writeJSON: ReturnType<typeof jest.fn>;
        exists: ReturnType<typeof jest.fn>;
        readJSON: ReturnType<typeof jest.fn>;
    };

    beforeEach(() => {
        fs = {
            writeJSON: jest.fn(),
            exists: jest.fn(),
            readJSON: jest.fn()
        };
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should throw an error if manifest structure is invalid', async () => {
        mockReadManifest.mockReturnValue({
            'sap.ui5': {}
        } as unknown as Manifest);
        mockGetUI5Versions.mockResolvedValue([{ version: '1.90.0' }]);

        await expect(
            validateAndUpdateManifestUI5Version('path/to/manifest.json', fs as unknown as Editor)
        ).rejects.toThrow(t('error.readManifestErrors.invalidManifestStructureError'));
    });

    it('should not modify the manifest if minUI5Version is valid', async () => {
        const manifest = {
            'sap.ui5': {
                dependencies: {
                    minUI5Version: '1.90.0'
                }
            },
            'sap.app': {
                sourceTemplate: {
                    id: fioriAppSourcetemplateId
                }
            }
        };
        mockReadManifest.mockReturnValue(manifest);
        mockGetUI5Versions.mockResolvedValue([{ version: '1.90.0' }]);

        await validateAndUpdateManifestUI5Version('path/to/manifest.json', fs as unknown as Editor);
        expect(fs.writeJSON).toHaveBeenCalledWith('path/to/manifest.json', manifest, undefined, 2);
    });

    it('should update minUI5Version to internal version if internal features are enabled', async () => {
        const manifest = {
            'sap.ui5': {
                dependencies: {
                    minUI5Version: '1.80.0'
                }
            },
            'sap.app': {
                sourceTemplate: {
                    id: fioriAppSourcetemplateId
                }
            }
        };
        mockReadManifest.mockReturnValue(manifest);
        mockGetUI5Versions.mockResolvedValue([{ version: '1.90.0' }]);
        mockIsInternalFeaturesSettingEnabled.mockReturnValue(true);

        await validateAndUpdateManifestUI5Version('path/to/manifest.json', fs as unknown as Editor);

        expect(fs.writeJSON).toHaveBeenCalledWith(
            'path/to/manifest.json',
            {
                'sap.ui5': {
                    dependencies: {
                        minUI5Version: '${sap.ui5.dist.version}'
                    }
                },
                'sap.app': {
                    sourceTemplate: {
                        id: fioriAppSourcetemplateId
                    }
                }
            },
            undefined,
            2
        );
    });

    it('should update minUI5Version to the closest available version if invalid', async () => {
        const manifest = {
            'sap.ui5': {
                dependencies: {
                    minUI5Version: '1.70.0'
                }
            },
            'sap.app': {
                sourceTemplate: {
                    id: fioriAppSourcetemplateId
                }
            }
        };
        mockReadManifest.mockReturnValue(manifest);
        mockGetUI5Versions.mockResolvedValue([{ version: '1.90.0' }]);
        mockIsInternalFeaturesSettingEnabled.mockReturnValue(false);

        await validateAndUpdateManifestUI5Version('path/to/manifest.json', fs as unknown as Editor);

        expect(fs.writeJSON).toHaveBeenCalledWith(
            'path/to/manifest.json',
            {
                'sap.ui5': {
                    dependencies: {
                        minUI5Version: '1.90.0'
                    }
                },
                'sap.app': {
                    sourceTemplate: {
                        id: fioriAppSourcetemplateId
                    }
                }
            },
            undefined,
            2
        );
    });
});

describe('replaceWebappFiles', () => {
    let fs: {
        exists: ReturnType<typeof jest.fn>;
        copy: ReturnType<typeof jest.fn>;
        readJSON: ReturnType<typeof jest.fn>;
        writeJSON: ReturnType<typeof jest.fn>;
    };

    beforeEach(() => {
        fs = {
            exists: jest.fn(),
            copy: jest.fn(),
            readJSON: jest.fn(),
            writeJSON: jest.fn()
        };
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should copy files from extractedPath to webappPath if they exist', async () => {
        const projectPath = '/project';
        const extractedPath = '/extracted';
        const webappPath = join(`${projectPath}/${DirName.Webapp}`);

        // Mock fs.exists to return true for all files
        fs.exists.mockReturnValue(true);
        await replaceWebappFiles(projectPath, extractedPath, fs as unknown as Editor);

        // Verify that fs.copy is called for each file
        expect(fs.writeJSON).toHaveBeenCalledWith(join(`${webappPath}/${FileName.Manifest}`), undefined, undefined, 2);
        expect(fs.copy).toHaveBeenCalledWith(
            join(`${extractedPath}/i18n/i18n.properties`),
            join(`${webappPath}/i18n/i18n.properties`)
        );
        expect(fs.copy).toHaveBeenCalledWith(join(`${extractedPath}/index.html`), join(`${webappPath}/index.html`));
        expect(fs.copy).toHaveBeenCalledWith(join(`${extractedPath}/component.js`), join(`${webappPath}/Component.js`));
    });

    it('should log a warning if a file does not exist in extractedPath', async () => {
        const projectPath = '/project';
        const extractedPath = '/extracted';
        const webappPath = join(`${projectPath}/${DirName.Webapp}`);

        // Mock fs.exists to return false for one file
        fs.exists.mockImplementation((filePath: string) => filePath !== join(`${extractedPath}/${FileName.Manifest}`));
        await replaceWebappFiles(projectPath, extractedPath, fs as unknown as Editor);

        // Verify that fs.copy is not called for the missing file
        expect(fs.copy).not.toHaveBeenCalledWith(
            join(`${extractedPath}/${FileName.Manifest}`),
            join(`${webappPath}/${FileName.Manifest}`)
        );
        expect(RepoAppDownloadLogger.logger?.warn).toHaveBeenCalledWith(
            t('warn.extractedFileNotFound', { extractedFilePath: join(`${extractedPath}/${FileName.Manifest}`) })
        );
    });

    it('should log an error if an exception occurs', async () => {
        const projectPath = '/project';
        const extractedPath = '/extracted';
        fs.exists.mockImplementation(() => {
            throw new Error('Test error');
        });
        await replaceWebappFiles(projectPath, extractedPath, fs as unknown as Editor);
        expect(RepoAppDownloadLogger.logger?.error).toHaveBeenCalledWith(
            t('error.replaceWebappFilesError', { error: new Error('Test error') })
        );
    });
});
