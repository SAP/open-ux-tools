import { jest } from '@jest/globals';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';

const realProjectAccess = await import('@sap-ux/project-access');
const realUtils = await import('../../../src/common/utils.js');
const realPrerequisites = await import('../../../src/cards-config/prerequisites.js');
const realUi5Yaml = await import('../../../src/common/ui5-yaml.js');

const mockGetProjectType = jest.fn<typeof realProjectAccess.getProjectType>();
const mockFindCapProjectRoot = jest.fn<typeof realProjectAccess.findCapProjectRoot>();
const mockReadManifest = jest.fn<typeof realUtils.readManifest>();

jest.unstable_mockModule('@sap-ux/project-access', () => ({
    ...realProjectAccess,
    getProjectType: mockGetProjectType,
    findCapProjectRoot: mockFindCapProjectRoot
}));

jest.unstable_mockModule('../../../src/common/utils.js', () => ({
    ...realUtils,
    readManifest: mockReadManifest
}));

jest.unstable_mockModule('../../../src/cards-config/prerequisites.js', () => ({
    ensureMinUI5Version: jest.fn<typeof realPrerequisites.ensureMinUI5Version>().mockResolvedValue(undefined)
}));

jest.unstable_mockModule('../../../src/common/ui5-yaml.js', () => ({
    ...realUi5Yaml,
    updateMiddlewaresForPreview: jest.fn<typeof realUi5Yaml.updateMiddlewaresForPreview>().mockResolvedValue(undefined)
}));

const { enableCardGeneratorConfig } = await import('../../../src/cards-config/index.js');
const { updateCapRootPackageJsonForCards } = await import('../../../src/cards-config/cap.js');

const __dirname = dirname(fileURLToPath(import.meta.url));

const CAP_ROOT = '/cap-root';
const APP_PATH = join(CAP_ROOT, 'app', 'my_app');
const APP_ID = 'ns.myapp';
const APP_FOLDER_NAME = 'my_app';

function createCapTestFs(options?: { cardGeneratorPath?: string }) {
    const fs = create(createStorage());
    const cardGeneratorPath = options?.cardGeneratorPath ?? '/test/flpCardGeneratorSandbox.html';
    fs.write(
        join(APP_PATH, 'ui5.yaml'),
        `specVersion: "3.0"
metadata:
  name: my_app
type: application
server:
  customMiddleware:
    - name: preview-middleware
      afterMiddleware: compression
      configuration:
        editors:
          cardGenerator:
            path: ${cardGeneratorPath}
`
    );
    fs.writeJSON(join(CAP_ROOT, 'package.json'), { name: 'cap-project' });
    return fs;
}

describe('updateCapRootPackageJsonForCards', () => {
    test('writes cds watch script to CAP root package.json with default path and intent', async () => {
        const fs = createCapTestFs();

        await updateCapRootPackageJsonForCards(CAP_ROOT, APP_ID, APP_FOLDER_NAME, APP_PATH, fs);

        const pkg = fs.readJSON(join(CAP_ROOT, 'package.json')) as Record<string, unknown>;
        expect((pkg.scripts as Record<string, string>)['start-cards-generator-my_app']).toBe(
            'cds watch --open "ns.myapp/test/flpCardGeneratorSandbox.html#app-preview"'
        );
    });

    test('writes cds watch script with custom card generator path from yaml', async () => {
        const fs = createCapTestFs({ cardGeneratorPath: '/test/myCustomCardGen.html' });

        await updateCapRootPackageJsonForCards(CAP_ROOT, APP_ID, APP_FOLDER_NAME, APP_PATH, fs);

        const pkg = fs.readJSON(join(CAP_ROOT, 'package.json')) as Record<string, unknown>;
        expect((pkg.scripts as Record<string, string>)['start-cards-generator-my_app']).toBe(
            'cds watch --open "ns.myapp/test/myCustomCardGen.html#app-preview"'
        );
    });

    test('uses appFolderName as script key suffix', async () => {
        const fs = createCapTestFs();

        await updateCapRootPackageJsonForCards(CAP_ROOT, APP_ID, 'another_app', APP_PATH, fs);

        const pkg = fs.readJSON(join(CAP_ROOT, 'package.json')) as Record<string, unknown>;
        expect((pkg.scripts as Record<string, string>)['start-cards-generator-another_app']).toBeDefined();
    });

    test('preserves existing scripts in CAP root package.json', async () => {
        const fs = createCapTestFs();
        fs.writeJSON(join(CAP_ROOT, 'package.json'), {
            name: 'cap-project',
            scripts: { 'watch-my_app': 'cds watch --open my_app/webapp/index.html' }
        });

        await updateCapRootPackageJsonForCards(CAP_ROOT, APP_ID, APP_FOLDER_NAME, APP_PATH, fs);

        const pkg = fs.readJSON(join(CAP_ROOT, 'package.json')) as Record<string, unknown>;
        const scripts = pkg.scripts as Record<string, string>;
        expect(scripts['watch-my_app']).toBe('cds watch --open my_app/webapp/index.html');
        expect(scripts['start-cards-generator-my_app']).toBeDefined();
    });

    test('throws when CAP root package.json does not exist', async () => {
        const fs = create(createStorage());

        await expect(updateCapRootPackageJsonForCards(CAP_ROOT, APP_ID, APP_FOLDER_NAME, APP_PATH, fs)).rejects.toThrow(
            `package.json not found at CAP root: ${CAP_ROOT}`
        );
    });
});

describe('enableCardGeneratorConfig - CAP routing', () => {
    const basePath = join(__dirname, '../../fixtures/cards-config/lrop-v4');
    const yamlPath = join(basePath, 'ui5.yaml');
    const capRoot = '/test-cap-root';

    beforeEach(() => {
        jest.resetAllMocks();
        mockReadManifest.mockResolvedValue({
            manifest: {
                'sap.app': { id: 'apps.v4.example' }
            }
        } as unknown as Awaited<ReturnType<typeof realUtils.readManifest>>);
        mockFindCapProjectRoot.mockResolvedValue(capRoot);
    });

    test('throws for CAPJava projects', async () => {
        mockGetProjectType.mockResolvedValue('CAPJava');

        await expect(enableCardGeneratorConfig(basePath, yamlPath)).rejects.toThrow(
            'The cards-editor command is not supported for CAP Java projects.'
        );
    });

    test('writes cds watch script to cap root for CAPNodejs', async () => {
        mockGetProjectType.mockResolvedValue('CAPNodejs');
        const fs = create(createStorage());
        fs.writeJSON(join(capRoot, 'package.json'), { name: 'cap-project' });

        await enableCardGeneratorConfig(basePath, yamlPath, undefined, fs);

        const pkg = fs.readJSON(join(capRoot, 'package.json')) as Record<string, unknown>;
        const scripts = pkg.scripts as Record<string, string>;
        expect(scripts['start-cards-generator-lrop-v4']).toMatch(/^cds watch --open "/);
    });

    test('does not write to cap root for EDMXBackend', async () => {
        mockGetProjectType.mockResolvedValue('EDMXBackend');
        const fs = create(createStorage());
        fs.writeJSON(join(capRoot, 'package.json'), { name: 'cap-project' });

        await enableCardGeneratorConfig(basePath, yamlPath, undefined, fs);

        const pkg = fs.readJSON(join(capRoot, 'package.json')) as Record<string, unknown>;
        expect(pkg.scripts).toBeUndefined();
    });
});
