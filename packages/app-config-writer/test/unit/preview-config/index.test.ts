import { jest } from '@jest/globals';
import { create as createStorage } from 'mem-fs';
import { create, type Editor } from 'mem-fs-editor';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ToolsLogger } from '@sap-ux/logger';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

jest.unstable_mockModule('chalk', () => ({
    default: chalk,
    cyan: (s: string) => s,
    yellow: (s: string) => s,
    red: (s: string) => s,
    green: (s: string) => s,
    blue: (s: string) => s,
    bold: (s: string) => s,
    dim: (s: string) => s
}));

jest.unstable_mockModule('prompts', () => ({
    prompt: jest.fn(),
    inject: jest.fn()
}));

const mockUpdateVariantsCreationScript = jest.fn().mockResolvedValue(undefined);
const actualPackageJson = await import('../../../src/preview-config/package-json');
jest.unstable_mockModule('../../../src/preview-config/package-json', () => ({
    ...actualPackageJson,
    updateVariantsCreationScript: mockUpdateVariantsCreationScript
}));

const mockUpdatePreviewMiddlewareConfigs = jest.fn().mockResolvedValue(undefined);
const actualUi5Yaml = await import('../../../src/preview-config/ui5-yaml');
jest.unstable_mockModule('../../../src/preview-config/ui5-yaml', () => ({
    ...actualUi5Yaml,
    updatePreviewMiddlewareConfigs: mockUpdatePreviewMiddlewareConfigs
}));

const mockRenameDefaultSandboxes = jest.fn().mockResolvedValue(undefined);
const mockDeleteNoLongerUsedFiles = jest.fn().mockResolvedValue(undefined);
const actualPreviewFiles = await import('../../../src/preview-config/preview-files');
jest.unstable_mockModule('../../../src/preview-config/preview-files', () => ({
    ...actualPreviewFiles,
    renameDefaultSandboxes: mockRenameDefaultSandboxes,
    deleteNoLongerUsedFiles: mockDeleteNoLongerUsedFiles
}));

const mockCheckPrerequisites = jest.fn().mockResolvedValue(true);
const actualPrerequisites = await import('../../../src/preview-config/prerequisites');
jest.unstable_mockModule('../../../src/preview-config/prerequisites', () => ({
    ...actualPrerequisites,
    checkPrerequisites: mockCheckPrerequisites
}));

const { convertToVirtualPreview } = await import('../../../src');

jest.useFakeTimers();

describe('index', () => {
    const logger = new ToolsLogger();
    const basePath = join(__dirname, '../../fixtures/preview-config');

    let fs: Editor;

    beforeEach(() => {
        jest.clearAllMocks();
        fs = create(createStorage());
        fs.write(
            join(basePath, 'package.json'),
            JSON.stringify({
                devDependencies: { '@ui5/cli': '3.0.0', '@sap-ux/ui5-middleware-fe-mockserver': '6.6.6' }
            })
        );
    });
    describe('convertToVirtualPreview', () => {
        test('convert project to virtual preview', async () => {
            await convertToVirtualPreview(basePath, { convertTests: false, logger, fs });
            expect(mockCheckPrerequisites).toHaveBeenCalled();
            expect(mockUpdatePreviewMiddlewareConfigs).toHaveBeenCalled();
            expect(mockRenameDefaultSandboxes).toHaveBeenCalled();
            expect(mockDeleteNoLongerUsedFiles).toHaveBeenCalled();
            expect(mockUpdateVariantsCreationScript).toHaveBeenCalled();
        });

        test('convert project to virtual preview (including tests w/o own yaml config)', async () => {
            fs.write(
                join(basePath, 'ui5.yaml'),
                `
            specVersion: '4.0'
            metadata:
            name: com.sap.cap.fe.ts.sample
            server:
                customMiddleware:
                - name: preview-middleware
                  afterMiddleware: compression
                  configuration:
                    test:
                      - framework: "Testsuite"
                        path: "yet/another/path.html"
                      - framework: "OPA5"
            `
            );

            await convertToVirtualPreview(basePath, { convertTests: true, logger, fs });
            expect(fs.read(join(basePath, 'ui5.yaml'))).toMatchSnapshot();
            expect(mockCheckPrerequisites).toHaveBeenCalled();
            expect(mockUpdatePreviewMiddlewareConfigs).toHaveBeenCalled();
            expect(mockRenameDefaultSandboxes).toHaveBeenCalled();
            expect(mockDeleteNoLongerUsedFiles).toHaveBeenCalled();
            expect(mockUpdateVariantsCreationScript).toHaveBeenCalled();
        });

        test('convert project to virtual preview (including tests with own yaml config)', async () => {
            fs.write(
                join(basePath, 'ui5.yaml'),
                `
            specVersion: '4.0'
            metadata:
            name: com.sap.cap.fe.ts.sample
            server:
                customMiddleware:
                - name: preview-middleware
                  afterMiddleware: compression
            `
            );
            fs.write(
                join(basePath, 'ui5-test.yaml'),
                `
            specVersion: '4.0'
            metadata:
            name: com.sap.cap.fe.ts.sample
            server:
                customMiddleware:
                - name: preview-middleware
                  afterMiddleware: compression
                  configuration:
                    test:
                      - framework: "Testsuite"
                        path: "yet/another/path.html"
                      - framework: "OPA5"
            `
            );

            await convertToVirtualPreview(basePath, { convertTests: true, logger, fs });
            expect(fs.read(join(basePath, 'ui5.yaml'))).toMatchSnapshot();
            expect(fs.read(join(basePath, 'ui5-test.yaml'))).toMatchSnapshot();
            expect(mockCheckPrerequisites).toHaveBeenCalled();
            expect(mockUpdatePreviewMiddlewareConfigs).toHaveBeenCalled();
            expect(mockRenameDefaultSandboxes).toHaveBeenCalled();
            expect(mockDeleteNoLongerUsedFiles).toHaveBeenCalled();
            expect(mockUpdateVariantsCreationScript).toHaveBeenCalled();
        });

        test('do not convert project to virtual preview - missing prerequisites', async () => {
            const missingPrerequisitesPath = join(basePath, 'missingPrerequisites');
            fs.write(
                join(missingPrerequisitesPath, 'package.json'),
                JSON.stringify({ devDependencies: { '@ui5/cli': '2.0.0' } })
            );

            mockCheckPrerequisites.mockResolvedValueOnce(false);

            await expect(
                convertToVirtualPreview(missingPrerequisitesPath, { convertTests: false, logger, fs })
            ).rejects.toThrow(`The prerequisites are not met. For more information, see the log messages above.`);
            expect(mockCheckPrerequisites).toHaveBeenCalled();
            expect(mockUpdatePreviewMiddlewareConfigs).not.toHaveBeenCalled();
            expect(mockRenameDefaultSandboxes).not.toHaveBeenCalled();
            expect(mockDeleteNoLongerUsedFiles).not.toHaveBeenCalled();
            expect(mockUpdateVariantsCreationScript).not.toHaveBeenCalled();
        });
    });
});
