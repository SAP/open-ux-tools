import { jest } from '@jest/globals';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';

const mockGetCapProjectInfo = jest.fn();
const mockUpdateCapRootPackageJsonForCards = jest.fn();

jest.unstable_mockModule('../../../src/common/cap-utils.js', () => ({
    getCapProjectInfo: mockGetCapProjectInfo,
    writeCdsWatchScript: jest.fn()
}));

jest.unstable_mockModule('../../../src/cards-config/cap.js', () => ({
    updateCapRootPackageJsonForCards: mockUpdateCapRootPackageJsonForCards
}));

const { enableCardGeneratorConfig } = await import('../../../src/cards-config/index.js');

function createTestFs(basePath: string) {
    const fs = create(createStorage());
    fs.writeJSON(join(basePath, 'webapp/manifest.json'), {
        'sap.app': {
            id: 'test.id',
            title: 'Test App'
        }
    });
    fs.writeJSON(join(basePath, 'package.json'), {});
    fs.write(join(basePath, 'ui5.yaml'), '');
    return fs;
}

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('enableCardGenerator', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGetCapProjectInfo.mockResolvedValue({ projectType: 'EDMXBackend', capRoot: null, appFolderName: 'lrop-v4' });
        mockUpdateCapRootPackageJsonForCards.mockResolvedValue(undefined);
    });

    test('Valid LROP', async () => {
        const basePath = join(__dirname, '../../fixtures/cards-config/lrop-v4');
        const fs = createTestFs(basePath);
        await enableCardGeneratorConfig(basePath, join(basePath, 'ui5.yaml'), undefined, fs);

        expect(fs.read(join(basePath, 'package.json'))).toMatchSnapshot();
        expect(fs.read(join(basePath, 'ui5.yaml'))).toMatchSnapshot();
    });

    test('V4 LROP with CLI 3.0', async () => {
        const basePath = join(__dirname, '../../fixtures/cards-config/lrop-v4');
        const fs = create(createStorage());
        await enableCardGeneratorConfig(basePath, join(basePath, 'ui5.yaml'), undefined, fs);

        if (process.env.UX_DEBUG) {
            fs.commit(() => {});
        }

        expect(fs.read(join(basePath, 'package.json'))).toMatchSnapshot();
        expect(fs.read(join(basePath, 'ui5.yaml'))).toMatchSnapshot();
    });

    test('Valid LROP without cardGenerator config', async () => {
        const basePath = join(__dirname, '../../fixtures/cards-config/lrop-v4');
        const fs = create(createStorage());
        await enableCardGeneratorConfig(basePath, join(basePath, 'ui5-without-generator.yaml'), undefined, fs);

        if (process.env.UX_DEBUG) {
            fs.commit(() => {});
        }

        expect(fs.read(join(basePath, 'package.json'))).toMatchSnapshot();
        expect(fs.read(join(basePath, 'ui5-without-generator.yaml'))).toMatchSnapshot();
    });

    test('Valid LROP with deprecated preview config', async () => {
        const basePath = join(__dirname, '../../fixtures/cards-config/lrop-v4');
        const fs = create(createStorage());
        await enableCardGeneratorConfig(basePath, join(basePath, 'ui5-with-deprecated-config.yaml'), undefined, fs);

        if (process.env.UX_DEBUG) {
            fs.commit(() => {});
        }

        expect(fs.read(join(basePath, 'package.json'))).toMatchSnapshot();
        expect(fs.read(join(basePath, 'ui5-with-deprecated-config.yaml'))).toMatchSnapshot();
    });

    test('Valid LROP with deprecated rta config', async () => {
        const basePath = join(__dirname, '../../fixtures/cards-config/lrop-v4');
        const fs = create(createStorage());
        await enableCardGeneratorConfig(basePath, join(basePath, 'ui5-with-deprecated-rta-config.yaml'), undefined, fs);

        if (process.env.UX_DEBUG) {
            fs.commit(() => {});
        }

        expect(fs.read(join(basePath, 'package.json'))).toMatchSnapshot();
        expect(fs.read(join(basePath, 'ui5-with-deprecated-rta-config.yaml'))).toMatchSnapshot();
    });

    test('Valid LROP with deprecated config with cards generator', async () => {
        const basePath = join(__dirname, '../../fixtures/cards-config/lrop-v4');
        const fs = create(createStorage());
        await enableCardGeneratorConfig(
            basePath,
            join(basePath, 'ui5-with-deprecated-config-and-cards-generator.yaml'),
            undefined,
            fs
        );

        if (process.env.UX_DEBUG) {
            fs.commit(() => {});
        }

        expect(fs.read(join(basePath, 'package.json'))).toMatchSnapshot();
        expect(fs.read(join(basePath, 'ui5-with-deprecated-config-and-cards-generator.yaml'))).toMatchSnapshot();
    });
});

describe('enableCardGeneratorConfig - CAP routing', () => {
    const basePath = join(__dirname, '../../fixtures/cards-config/lrop-v4');
    const yamlPath = join(basePath, 'ui5.yaml');

    beforeEach(() => {
        jest.resetAllMocks();
        mockUpdateCapRootPackageJsonForCards.mockResolvedValue(undefined);
    });

    test('throws for CAPJava projects', async () => {
        mockGetCapProjectInfo.mockResolvedValue({
            projectType: 'CAPJava',
            capRoot: '/cap-root',
            appFolderName: 'lrop-v4',
            appId: 'apps.v4.example'
        });

        await expect(enableCardGeneratorConfig(basePath, yamlPath)).rejects.toThrow(
            'The cards-editor command is not supported for CAP Java projects.'
        );
        expect(mockUpdateCapRootPackageJsonForCards).not.toHaveBeenCalled();
    });

    test('calls updateCapRootPackageJsonForCards for CAPNodejs', async () => {
        mockGetCapProjectInfo.mockResolvedValue({
            projectType: 'CAPNodejs',
            capRoot: '/cap-root',
            appFolderName: 'lrop-v4',
            appId: 'apps.v4.example'
        });

        await enableCardGeneratorConfig(basePath, yamlPath);

        expect(mockUpdateCapRootPackageJsonForCards).toHaveBeenCalledWith(
            '/cap-root',
            'apps.v4.example',
            'lrop-v4',
            basePath,
            expect.anything(),
            yamlPath,
            undefined
        );
    });

    test('uses updatePackageJson for EDMXBackend', async () => {
        mockGetCapProjectInfo.mockResolvedValue({ projectType: 'EDMXBackend', capRoot: null, appFolderName: 'lrop-v4' });

        const fs = await enableCardGeneratorConfig(basePath, yamlPath);

        expect(mockUpdateCapRootPackageJsonForCards).not.toHaveBeenCalled();
        expect(fs.exists(join(basePath, 'package.json'))).toBe(true);
    });
});
