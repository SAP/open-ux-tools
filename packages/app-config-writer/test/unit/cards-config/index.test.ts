import { jest } from '@jest/globals';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';

const mockGetProjectType = jest.fn();
const mockFindCapProjectRoot = jest.fn();
const mockReadManifest = jest.fn();
const mockUpdateCapRootPackageJsonForCards = jest.fn();

const realProjectAccess = await import('@sap-ux/project-access');

jest.unstable_mockModule('@sap-ux/project-access', () => ({
    ...realProjectAccess,
    getProjectType: mockGetProjectType,
    findCapProjectRoot: mockFindCapProjectRoot
}));

const realUtils = await import('../../../src/common/utils.js');
const realUi5Yaml = await import('../../../src/common/ui5-yaml.js');

jest.unstable_mockModule('../../../src/common/utils.js', () => ({
    ...realUtils,
    readManifest: mockReadManifest
}));

jest.unstable_mockModule('../../../src/cards-config/prerequisites.js', () => ({
    ensureMinUI5Version: jest.fn().mockResolvedValue(undefined)
}));

jest.unstable_mockModule('../../../src/common/ui5-yaml.js', () => ({
    ...realUi5Yaml,
    updateMiddlewaresForPreview: jest.fn().mockResolvedValue(undefined)
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
        mockGetProjectType.mockResolvedValue('EDMXBackend');
        mockFindCapProjectRoot.mockResolvedValue(null);
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
        mockReadManifest.mockResolvedValue({ manifest: { 'sap.app': { id: 'apps.v4.example' } } });
        mockFindCapProjectRoot.mockResolvedValue('/cap-root');
    });

    test('throws for CAPJava projects', async () => {
        mockGetProjectType.mockResolvedValue('CAPJava');

        await expect(enableCardGeneratorConfig(basePath, yamlPath)).rejects.toThrow(
            'The cards-editor command is not supported for CAP Java projects.'
        );
        expect(mockUpdateCapRootPackageJsonForCards).not.toHaveBeenCalled();
    });

    test('calls updateCapRootPackageJsonForCards for CAPNodejs', async () => {
        mockGetProjectType.mockResolvedValue('CAPNodejs');

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

    test('does not call updateCapRootPackageJsonForCards for EDMXBackend', async () => {
        mockGetProjectType.mockResolvedValue('EDMXBackend');

        await enableCardGeneratorConfig(basePath, yamlPath);

        expect(mockUpdateCapRootPackageJsonForCards).not.toHaveBeenCalled();
    });
});
