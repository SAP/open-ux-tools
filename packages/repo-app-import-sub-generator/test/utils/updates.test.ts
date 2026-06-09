import { validateAndUpdateManifestUI5Version, replaceWebappFiles } from '../../src/utils/updates';
import type { Editor } from 'mem-fs-editor';
import { t } from '../../src/utils/i18n';
import { getUI5Versions } from '@sap-ux/ui5-info';
import { isInternalFeaturesSettingEnabled } from '@sap-ux/feature-toggle';
import type { Manifest } from '@sap-ux/project-access';
import { readManifest } from '../../src/utils/file-helpers';
import { join } from 'node:path';
import { FileName, DirName } from '@sap-ux/project-access';
import RepoAppDownloadLogger from '../../src/utils/logger';
import { fioriAppSourcetemplateId } from '../../src/utils/constants';

jest.mock('@sap-ux/ui5-info', () => ({
    ...jest.requireActual('@sap-ux/ui5-info'),
    getUI5Versions: jest.fn()
}));

jest.mock('@sap-ux/feature-toggle', () => ({
    ...jest.requireActual('@sap-ux/feature-toggle'),
    isInternalFeaturesSettingEnabled: jest.fn()
}));

jest.mock('../../src/utils/file-helpers', () => ({
    ...jest.requireActual('../../src/utils/file-helpers'),
    readManifest: jest.fn()
}));

jest.mock('../../src/utils/logger', () => ({
    logger: {
        error: jest.fn(),
        warn: jest.fn()
    }
}));

describe('validateAndUpdateManifestUI5Version', () => {
    let fs: jest.Mocked<Editor>;

    beforeEach(() => {
        fs = {
            writeJSON: jest.fn(),
            exists: jest.fn(),
            readJSON: jest.fn()
        } as unknown as jest.Mocked<Editor>;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should throw an error if sap.ui5.dependencies is missing', async () => {
        (readManifest as jest.Mock).mockReturnValue({ 'sap.ui5': {} } as unknown as Manifest);
        (getUI5Versions as jest.Mock).mockResolvedValue([{ version: '1.90.0' }]);

        await expect(validateAndUpdateManifestUI5Version('path/to/manifest.json', fs)).rejects.toThrow(
            t('error.readManifestErrors.invalidManifestStructureError')
        );
    });

    it('should throw an error if sap.app.sourceTemplate is missing', async () => {
        (readManifest as jest.Mock).mockReturnValue({
            'sap.ui5': { dependencies: { minUI5Version: '1.90.0' } },
            'sap.app': {}
        } as unknown as Manifest);
        (getUI5Versions as jest.Mock).mockResolvedValue([{ version: '1.90.0' }]);

        await expect(validateAndUpdateManifestUI5Version('path/to/manifest.json', fs)).rejects.toThrow(
            t('error.readManifestErrors.invalidManifestStructureError')
        );
    });

    it('should keep minUI5Version unchanged if it is a known released version', async () => {
        const manifest = {
            'sap.ui5': { dependencies: { minUI5Version: '1.90.0' } },
            'sap.app': { sourceTemplate: { id: 'old-template-id' } }
        };
        (readManifest as jest.Mock).mockReturnValue(manifest);
        (getUI5Versions as jest.Mock).mockResolvedValue([{ version: '1.90.0' }]);

        await validateAndUpdateManifestUI5Version('path/to/manifest.json', fs);

        expect(fs.writeJSON).toHaveBeenCalledWith(
            'path/to/manifest.json',
            {
                'sap.ui5': { dependencies: { minUI5Version: '1.90.0' } },
                'sap.app': { sourceTemplate: { id: fioriAppSourcetemplateId } }
            },
            undefined,
            2
        );
    });

    it('should update minUI5Version to internal snapshot version when internal features are enabled', async () => {
        const manifest = {
            'sap.ui5': { dependencies: { minUI5Version: '1.80.0' } },
            'sap.app': { sourceTemplate: { id: 'old-template-id' } }
        };
        (readManifest as jest.Mock).mockReturnValue(manifest);
        (getUI5Versions as jest.Mock).mockResolvedValue([{ version: '1.90.0' }]);
        (isInternalFeaturesSettingEnabled as jest.Mock).mockReturnValue(true);

        await validateAndUpdateManifestUI5Version('path/to/manifest.json', fs);

        expect(fs.writeJSON).toHaveBeenCalledWith(
            'path/to/manifest.json',
            {
                'sap.ui5': { dependencies: { minUI5Version: '${sap.ui5.dist.version}' } },
                'sap.app': { sourceTemplate: { id: fioriAppSourcetemplateId } }
            },
            undefined,
            2
        );
    });

    it('should fall back to the latest released version and update sourceTemplate', async () => {
        const manifest = {
            'sap.ui5': { dependencies: { minUI5Version: '1.70.0' } },
            'sap.app': { sourceTemplate: { id: 'old-template-id' } }
        };
        (readManifest as jest.Mock).mockReturnValue(manifest);
        (getUI5Versions as jest.Mock).mockResolvedValue([{ version: '1.90.0' }]);
        (isInternalFeaturesSettingEnabled as jest.Mock).mockReturnValue(false);

        await validateAndUpdateManifestUI5Version('path/to/manifest.json', fs);

        expect(fs.writeJSON).toHaveBeenCalledWith(
            'path/to/manifest.json',
            {
                'sap.ui5': { dependencies: { minUI5Version: '1.90.0' } },
                'sap.app': { sourceTemplate: { id: fioriAppSourcetemplateId } }
            },
            undefined,
            2
        );
    });
});

describe('replaceWebappFiles', () => {
    let fs: jest.Mocked<Editor>;

    beforeEach(() => {
        fs = {
            exists: jest.fn(),
            copy: jest.fn(),
            readJSON: jest.fn(),
            writeJSON: jest.fn()
        } as unknown as jest.Mocked<Editor>;
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
        await replaceWebappFiles(projectPath, extractedPath, fs);

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
        fs.exists.mockImplementation((filePath) => filePath !== join(`${extractedPath}/${FileName.Manifest}`));
        await replaceWebappFiles(projectPath, extractedPath, fs);

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
        await replaceWebappFiles(projectPath, extractedPath, fs);
        expect(RepoAppDownloadLogger.logger?.error).toHaveBeenCalledWith(
            t('error.replaceWebappFilesError', { error: new Error('Test error') })
        );
    });
});
