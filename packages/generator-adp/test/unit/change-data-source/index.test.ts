import { jest } from '@jest/globals';
import fs from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import yeomanTest from 'yeoman-test';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import type { Manifest } from '@sap-ux/project-access';
import type { AbapTarget } from '@sap-ux/system-access';
import type { ChangeDataSourceAnswers, DescriptorVariant } from '@sap-ux/adp-tooling';

import type { Credentials } from '../../../src/types';

const mockGenerateChange = jest.fn();
const mockGetVariant = jest.fn();
const mockGetAdpConfig = jest.fn();
const mockIsCFEnvironment = jest.fn().mockResolvedValue(false);
const mockManifestServiceCFInit = jest.fn();

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

jest.unstable_mockModule('@sap-ux/system-access', () => ({
    createAbapServiceProvider: jest.fn().mockResolvedValue({})
}));

const { ManifestService, SystemLookup, ChangeType } = await import('@sap-ux/adp-tooling');
const { default: changeDataSourceGen } = await import('../../../src/change-data-source');

const manifest = {
    'sap.app': {
        dataSources: {
            Z_SRV: {
                uri: '/sap/opu/odata',
                type: 'OData',
                settings: { annotations: ['Z_SRV_ANNO'] }
            },
            Z_SRV_ANNO: {
                uri: '/sap/opu/odata/annotation',
                type: 'ODataAnnotation',
                settings: {}
            }
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

const answers: ChangeDataSourceAnswers & Credentials & { errorMessagePrompt: string } = {
    id: 'Z_SRV',
    uri: '/sap/opu/odata/new',
    maxAge: 120,
    annotationUri: '/sap/opu/odata/new/annotation',
    errorMessagePrompt: 'failed',
    username: 'user',
    password: 'pass'
};

jest.spyOn(SystemLookup.prototype, 'getSystemRequiresAuth').mockResolvedValue(true);

const generatorPath = join(__dirname, 'src/change-data-source/index.ts');
const tmpDir = resolve(__dirname, 'test-output-change-data-source');
const originalCwd: string = process.cwd();

describe('ChangeDataSourceGenerator', () => {
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
            .create(changeDataSourceGen, { resolved: generatorPath }, { cwd: tmpDir })
            .withOptions({ data: { path: tmpDir } })
            .withPrompts(answers);

        await expect(runContext.run()).resolves.not.toThrow();

        expect(mockGenerateChange).toHaveBeenCalledWith(
            tmpDir,
            ChangeType.CHANGE_DATA_SOURCE,
            expect.objectContaining({
                service: {
                    id: answers.id,
                    uri: answers.uri,
                    maxAge: answers.maxAge,
                    annotationUri: answers.annotationUri
                },
                variant: {
                    id: variant.id,
                    layer: variant.layer,
                    namespace: variant.namespace,
                    reference: variant.reference
                },
                dataSources: manifest['sap.app']?.dataSources
            }),
            expect.anything()
        );
    });

    it('invokes handleRuntimeCrash when manifest merge fails', async () => {
        mockGetVariant.mockResolvedValue(variant);
        mockGetAdpConfig.mockResolvedValue({ target, ignoreCertErrors: false } as any);

        jest.spyOn(ManifestService, 'initMergedManifest').mockRejectedValueOnce(new Error('merge fail'));

        const handleCrashSpy = jest
            .spyOn((changeDataSourceGen as any).prototype, 'handleRuntimeCrash')
            .mockResolvedValueOnce(undefined);

        const writingSpy = jest
            .spyOn((changeDataSourceGen as any).prototype, 'writing')
            .mockImplementationOnce(async () => undefined);

        const runContext = yeomanTest
            .create(changeDataSourceGen, { resolved: generatorPath }, { cwd: tmpDir })
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
            .spyOn((changeDataSourceGen as any).prototype, 'handleRuntimeCrash')
            .mockResolvedValueOnce(undefined);

        const writingSpy = jest
            .spyOn((changeDataSourceGen as any).prototype, 'writing')
            .mockImplementationOnce(async () => undefined);

        const runContext = yeomanTest
            .create(changeDataSourceGen, { resolved: generatorPath }, { cwd: tmpDir })
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
            .create(changeDataSourceGen, { resolved: generatorPath }, { cwd: tmpDir })
            .withOptions({ data: { path: tmpDir } })
            .withPrompts(answers);

        await expect(runContext.run()).resolves.not.toThrow();

        expect(mockManifestServiceCFInit).toHaveBeenCalledWith(tmpDir, expect.anything());
        expect(mockGenerateChange).toHaveBeenCalledWith(
            tmpDir,
            ChangeType.CHANGE_DATA_SOURCE,
            expect.objectContaining({
                service: expect.objectContaining({
                    id: answers.id,
                    uri: answers.uri
                }),
                dataSources: manifest['sap.app']?.dataSources
            }),
            expect.anything()
        );
    });
});
