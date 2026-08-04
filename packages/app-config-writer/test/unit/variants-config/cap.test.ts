import { jest } from '@jest/globals';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';

const realProjectAccess = await import('@sap-ux/project-access');
const realUtils = await import('../../../src/common/utils.js');
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

jest.unstable_mockModule('../../../src/common/ui5-yaml.js', () => ({
    ...realUi5Yaml,
    updateMiddlewaresForPreview: jest.fn<typeof realUi5Yaml.updateMiddlewaresForPreview>().mockResolvedValue(undefined)
}));

const { generateVariantsConfig } = await import('../../../src/variants-config/generateVariantsConfig.js');
const { updateCapRootPackageJsonForVariants } = await import('../../../src/variants-config/cap.js');

const __dirname = dirname(fileURLToPath(import.meta.url));

const CAP_ROOT = '/cap-root';
const APP_PATH = join(CAP_ROOT, 'app', 'my_app');
const APP_ID = 'ns.myapp';
const APP_FOLDER_NAME = 'my_app';

function createTestFs(rtaPath = '/my-variants.html') {
    const fs = create(createStorage());
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
        flp:
          intent:
            object: hello
            action: world
        editors:
          rta:
            layer: VENDOR
            endpoints:
              - path: /editor.html
                developerMode: true
              - path: ${rtaPath}
`
    );
    fs.writeJSON(join(APP_PATH, 'package.json'), {
        name: 'my-app',
        devDependencies: { '@sap-ux/preview-middleware': '0.17.0' }
    });
    fs.writeJSON(join(CAP_ROOT, 'package.json'), { name: 'cap-project', dependencies: { '@sap/cds': '7.0.0' } });
    return fs;
}

describe('updateCapRootPackageJsonForVariants', () => {
    test('writes cds watch script to CAP root package.json', async () => {
        const fs = createTestFs();

        await updateCapRootPackageJsonForVariants(CAP_ROOT, APP_ID, APP_FOLDER_NAME, APP_PATH, fs);

        const pkg = fs.readJSON(join(CAP_ROOT, 'package.json')) as Record<string, unknown>;
        const scripts = pkg.scripts as Record<string, string>;
        expect(scripts['start-variants-management-my_app']).toBe(
            'cds watch --open "ns.myapp/my-variants.html#hello-world"'
        );
    });

    test('uses appFolderName as script key suffix', async () => {
        const fs = createTestFs();
        fs.writeJSON(join(CAP_ROOT, 'package.json'), { name: 'cap-project' });

        await updateCapRootPackageJsonForVariants(CAP_ROOT, APP_ID, 'another_app', APP_PATH, fs);

        const pkg = fs.readJSON(join(CAP_ROOT, 'package.json')) as Record<string, unknown>;
        expect((pkg.scripts as Record<string, string>)['start-variants-management-another_app']).toBeDefined();
    });

    test('preserves existing scripts in CAP root package.json', async () => {
        const fs = createTestFs();
        fs.writeJSON(join(CAP_ROOT, 'package.json'), {
            name: 'cap-project',
            scripts: { 'watch-my_app': 'cds watch --open my_app/webapp/index.html' }
        });

        await updateCapRootPackageJsonForVariants(CAP_ROOT, APP_ID, APP_FOLDER_NAME, APP_PATH, fs);

        const pkg = fs.readJSON(join(CAP_ROOT, 'package.json')) as Record<string, unknown>;
        const scripts = pkg.scripts as Record<string, string>;
        expect(scripts['watch-my_app']).toBe('cds watch --open my_app/webapp/index.html');
        expect(scripts['start-variants-management-my_app']).toBeDefined();
    });

    test('throws when CAP root package.json does not exist', async () => {
        const fs = create(createStorage());

        await expect(
            updateCapRootPackageJsonForVariants(CAP_ROOT, APP_ID, APP_FOLDER_NAME, APP_PATH, fs)
        ).rejects.toThrow(`package.json not found at CAP root: ${CAP_ROOT}`);
    });

    test('throws when no RTA editor specified in ui5.yaml', async () => {
        const fs = create(createStorage());
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
        flp:
          intent:
            object: hello
            action: world
`
        );
        fs.writeJSON(join(APP_PATH, 'package.json'), { name: 'my-app' });
        fs.writeJSON(join(CAP_ROOT, 'package.json'), { name: 'cap-project' });

        await expect(
            updateCapRootPackageJsonForVariants(CAP_ROOT, APP_ID, APP_FOLDER_NAME, APP_PATH, fs)
        ).rejects.toThrow(
            `Script 'start-variants-management-my_app' cannot be written to package.json. No RTA editor specified in ui5.yaml.`
        );
    });
});

describe('generateVariantsConfig - CAP routing', () => {
    const basePath = join(__dirname, '../../fixtures/variants-config');
    const yamlPath = join(basePath, 'ui5.yaml');
    const capRoot = '/test-cap-root';

    beforeEach(() => {
        jest.resetAllMocks();
        mockReadManifest.mockResolvedValue({ manifest: { 'sap.app': { id: 'test.app' } } } as unknown as Awaited<
            ReturnType<typeof realUtils.readManifest>
        >);
        mockFindCapProjectRoot.mockResolvedValue(capRoot);
    });

    test('throws for CAPJava projects', async () => {
        mockGetProjectType.mockResolvedValue('CAPJava');

        await expect(generateVariantsConfig(basePath, yamlPath)).rejects.toThrow(
            'The variants-config command is not supported for CAP Java projects.'
        );
    });

    test('throws early when projectType is CAPNodejs but no CAP root was found', async () => {
        mockFindCapProjectRoot.mockResolvedValue(null);
        mockGetProjectType.mockResolvedValue('CAPNodejs');

        await expect(generateVariantsConfig(basePath, yamlPath)).rejects.toThrow(
            `Could not find CAP project root for path '${basePath}'.`
        );
    });

    test('writes cds watch script to cap root for CAPNodejs', async () => {
        mockGetProjectType.mockResolvedValue('CAPNodejs');
        const fs = create(createStorage());
        fs.writeJSON(join(capRoot, 'package.json'), { name: 'cap-project' });

        await generateVariantsConfig(basePath, yamlPath, undefined, fs);

        const pkg = fs.readJSON(join(capRoot, 'package.json')) as Record<string, unknown>;
        const scripts = pkg.scripts as Record<string, string>;
        expect(scripts['start-variants-management-variants-config']).toMatch(/^cds watch --open "/);
    });

    test('does not write to cap root for EDMXBackend', async () => {
        mockGetProjectType.mockResolvedValue('EDMXBackend');
        const fs = create(createStorage());
        fs.writeJSON(join(capRoot, 'package.json'), { name: 'cap-project' });

        await generateVariantsConfig(basePath, yamlPath, undefined, fs);

        const pkg = fs.readJSON(join(capRoot, 'package.json')) as Record<string, unknown>;
        expect(pkg.scripts).toBeUndefined();
    });
});
