import { jest } from '@jest/globals';
import fs from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import yeomanTest from 'yeoman-test';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import type { Manifest } from '@sap-ux/project-access';
import type { AbapTarget } from '@sap-ux/system-access';
import type { DescriptorVariant } from '@sap-ux/adp-tooling';

const mockGenerateChange = jest.fn();
const mockGetVariant = jest.fn();
const mockGetAdpConfig = jest.fn();
const mockIsCFEnvironment = jest.fn().mockResolvedValue(false);
const mockManifestServiceCFInit = jest.fn();
const mockGetTemplatesOverwritePath = jest.fn();

const realAdpTooling = await import('@sap-ux/adp-tooling');
jest.unstable_mockModule('@sap-ux/adp-tooling', () => ({
    ...realAdpTooling,
    generateChange: mockGenerateChange,
    getVariant: mockGetVariant,
    getAdpConfig: mockGetAdpConfig,
    getAdpProjectData: jest.fn(),
    isCFEnvironment: mockIsCFEnvironment,
    ManifestServiceCF: { init: mockManifestServiceCFInit }
}));

jest.unstable_mockModule('../../../src/utils/templates', () => ({
    getTemplatesOverwritePath: mockGetTemplatesOverwritePath
}));

jest.unstable_mockModule('@sap-ux/odata-service-writer', () => ({
    getAnnotationNamespaces: jest.fn(() => [{ namespace: 'ns', alias: 'ALIAS' }])
}));

jest.unstable_mockModule('@sap-ux/system-access', () => ({
    createAbapServiceProvider: jest.fn().mockResolvedValue({})
}));

const { ManifestService, SystemLookup, ChangeType, AnnotationFileSelectType } = await import('@sap-ux/adp-tooling');
const { default: annotationGen } = await import('../../../src/add-annotations-to-odata');

// Set template path mock to return the real template path
const templatePath = join(__dirname, 'src/add-annotations-to-odata/templates');
mockGetTemplatesOverwritePath.mockReturnValue(templatePath);

const manifest = {
    'sap.app': {
        dataSources: {
            Z_SRV: { uri: '/sap/opu/odata', type: 'OData', settings: {} }
        }
    }
} as unknown as Manifest;

const variant = {
    reference: 'customer.adp.variant',
    id: 'customer.adp.variant',
    layer: 'CUSTOMER_BASE',
    namespace: 'apps/fin.test.appvar.av1/appVariants/customer.adp.variant/'
} as DescriptorVariant;

const target: AbapTarget = {
    url: 'some-system',
    client: '100',
    destination: 'SYS_010'
};

const answers = {
    id: 'Z_SRV',
    fileSelectOption: AnnotationFileSelectType.NewEmptyFile,
    filePath: '/file.xml',
    errorMessagePrompt: 'failed',
    username: 'user',
    password: 'pass'
};

jest.spyOn(SystemLookup.prototype, 'getSystemRequiresAuth').mockResolvedValue(true);

const generatorPath = join(__dirname, 'src/add-annotations-to-odata/index.ts');
const tmpDir = resolve(__dirname, 'test-output-add-annotations');
const originalCwd: string = process.cwd();

describe('AddAnnotationsToDataGenerator', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    afterAll(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true });
        process.chdir(originalCwd);
    });

    it('generates change with namespaces when new empty file selected', async () => {
        jest.spyOn(ManifestService, 'initMergedManifest').mockResolvedValue({
            getManifest: jest.fn().mockReturnValue(manifest),
            getManifestDataSources: jest.fn().mockReturnValue(manifest['sap.app']?.dataSources),
            getDataSourceMetadata: jest.fn().mockResolvedValue({ $Version: '4.0' })
        } as unknown as ManifestService);

        mockGetVariant.mockResolvedValue(variant);
        mockGetAdpConfig.mockResolvedValue({ target, ignoreCertErrors: false } as any);

        const runContext = yeomanTest
            .create(annotationGen, { resolved: generatorPath }, { cwd: tmpDir })
            .withOptions({ data: { path: tmpDir } })
            .withPrompts(answers);

        await expect(runContext.run()).resolves.not.toThrow();

        expect(mockGenerateChange).toHaveBeenCalledWith(
            tmpDir,
            ChangeType.ADD_ANNOTATIONS_TO_ODATA,
            expect.objectContaining({
                annotation: {
                    dataSource: answers.id,
                    filePath: undefined,
                    namespaces: [{ alias: 'ALIAS', namespace: 'ns' }],
                    serviceUrl: '/sap/opu/odata'
                },
                isCommand: true,
                variant: {
                    id: variant.id,
                    layer: variant.layer,
                    namespace: variant.namespace,
                    reference: variant.reference
                }
            }),
            expect.anything(),
            expect.stringContaining('templates')
        );
    });

    it('invokes handleRuntimeCrash when manifest merge fails', async () => {
        mockGetVariant.mockResolvedValue(variant);
        mockGetAdpConfig.mockResolvedValue({ target, ignoreCertErrors: false } as any);

        jest.spyOn(ManifestService, 'initMergedManifest').mockRejectedValueOnce(new Error('merge fail'));

        const handleCrashSpy = jest
            .spyOn((annotationGen as any).prototype, 'handleRuntimeCrash')
            .mockResolvedValueOnce(undefined);

        const writingSpy = jest
            .spyOn((annotationGen as any).prototype, 'writing')
            .mockImplementationOnce(async () => undefined);

        const runContext = yeomanTest
            .create(annotationGen, { resolved: generatorPath }, { cwd: tmpDir })
            .withOptions({ data: { path: tmpDir } })
            .withPrompts(answers);

        await expect(runContext.run()).resolves.not.toThrow();

        expect(handleCrashSpy).toHaveBeenCalledWith('merge fail');

        writingSpy.mockRestore();
        handleCrashSpy.mockRestore();
    });

    it('invokes handleRuntimeCrash when system lookup fails during onInit', async () => {
        mockGetVariant.mockResolvedValue(variant);
        mockGetAdpConfig.mockResolvedValue({ target, ignoreCertErrors: false } as any);

        jest.spyOn(SystemLookup.prototype, 'getSystemRequiresAuth').mockRejectedValueOnce(
            new Error('system lookup fail')
        );

        const handleCrashSpy = jest
            .spyOn((annotationGen as any).prototype, 'handleRuntimeCrash')
            .mockResolvedValueOnce(undefined);

        const writingSpy = jest
            .spyOn((annotationGen as any).prototype, 'writing')
            .mockImplementationOnce(async () => undefined);

        const runContext = yeomanTest
            .create(annotationGen, { resolved: generatorPath }, { cwd: tmpDir })
            .withOptions({ data: { path: tmpDir } })
            .withPrompts({ ...answers });

        await expect(runContext.run()).resolves.not.toThrow();

        expect(handleCrashSpy).toHaveBeenCalledWith('system lookup fail');

        writingSpy.mockRestore();
        handleCrashSpy.mockRestore();
    });

    it('generates change for CF project using ManifestServiceCF', async () => {
        mockIsCFEnvironment.mockResolvedValueOnce(true);

        mockManifestServiceCFInit.mockResolvedValue({
            getManifest: jest.fn().mockReturnValue(manifest),
            getManifestDataSources: jest.fn().mockReturnValue(manifest['sap.app']?.dataSources),
            getDataSourceMetadata: jest.fn().mockRejectedValue(new Error('not supported'))
        } as any);

        mockGetVariant.mockResolvedValue(variant);

        const runContext = yeomanTest
            .create(annotationGen, { resolved: generatorPath }, { cwd: tmpDir })
            .withOptions({ data: { path: tmpDir } })
            .withPrompts(answers);

        await expect(runContext.run()).resolves.not.toThrow();

        expect(mockManifestServiceCFInit).toHaveBeenCalledWith(tmpDir, expect.anything());
        expect(mockGenerateChange).toHaveBeenCalledWith(
            tmpDir,
            ChangeType.ADD_ANNOTATIONS_TO_ODATA,
            expect.objectContaining({
                annotation: expect.objectContaining({
                    dataSource: answers.id,
                    filePath: undefined
                }),
                isCommand: true
            }),
            expect.anything(),
            expect.stringContaining('templates')
        );
    });
});
