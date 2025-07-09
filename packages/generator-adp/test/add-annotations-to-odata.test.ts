import fs from 'fs';
import { join, resolve } from 'path';
import yeomanTest from 'yeoman-test';

import type { Manifest } from '@sap-ux/project-access';
import type { AdpProjectData, DescriptorVariant } from '@sap-ux/adp-tooling';
import {
    ChangeType,
    generateChange,
    getAdpConfig,
    getVariant,
    getAdpProjectData,
    ManifestService,
    SystemLookup,
    AnnotationFileSelectType
} from '@sap-ux/adp-tooling';

import annotationGen from '../src/add-annotations-to-odata';

jest.mock('@sap-ux/adp-tooling', () => ({
    ...jest.requireActual('@sap-ux/adp-tooling'),
    generateChange: jest.fn(),
    getVariant: jest.fn(),
    getAdpConfig: jest.fn(),
    getAdpProjectData: jest.fn()
}));

jest.mock('@sap-ux/odata-service-writer', () => ({
    getAnnotationNamespaces: jest.fn(() => [{ namespace: 'ns', alias: 'ALIAS' }])
}));

jest.mock('@sap-ux/system-access', () => ({
    createAbapServiceProvider: jest.fn().mockResolvedValue({})
}));

const generateChangeMock = generateChange as jest.MockedFunction<typeof generateChange>;
const getVariantMock = getVariant as jest.MockedFunction<typeof getVariant>;
const getAdpConfigMock = getAdpConfig as jest.MockedFunction<typeof getAdpConfig>;
const getAdpProjectDataMock = getAdpProjectData as jest.MockedFunction<typeof getAdpProjectData>;

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

const projectData = {
    sourceSystem: 'SYS_010',
    client: '100'
} as AdpProjectData;

const answers = {
    id: 'Z_SRV',
    fileSelectOption: AnnotationFileSelectType.NewEmptyFile,
    filePath: '/file.xml',
    errorMessagePrompt: 'failed',
    username: 'user',
    password: 'pass'
};

jest.spyOn(SystemLookup.prototype, 'getSystemRequiresAuth').mockResolvedValue(true);

const generatorPath = join(__dirname, '../../src/add-annotations-to-odata/index.ts');
const tmpDir = resolve(__dirname, 'test-output');

describe('AddAnnotationsToDataGenerator', () => {
    beforeAll(() => fs.mkdirSync(tmpDir, { recursive: true }));

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('generates change with namespaces when new empty file selected', async () => {
        jest.spyOn(ManifestService, 'initMergedManifest').mockResolvedValue({
            getManifest: jest.fn().mockReturnValue(manifest),
            getManifestDataSources: jest.fn().mockReturnValue(manifest['sap.app']?.dataSources),
            getDataSourceMetadata: jest.fn().mockResolvedValue({ $Version: '4.0' })
        } as unknown as ManifestService);

        getVariantMock.mockResolvedValue(variant);
        getAdpConfigMock.mockResolvedValue({ target: {} as any, ignoreCertErrors: false } as any);
        getAdpProjectDataMock.mockResolvedValue(projectData);

        const runContext = yeomanTest
            .create(annotationGen, { resolved: generatorPath }, { cwd: tmpDir })
            .withOptions({ data: { path: tmpDir } })
            .withPrompts(answers);

        await expect(runContext.run()).resolves.not.toThrow();

        expect(generateChangeMock).toHaveBeenCalledWith(
            tmpDir,
            ChangeType.ADD_ANNOTATIONS_TO_ODATA,
            expect.objectContaining({
                annotation: expect.objectContaining({ namespaces: [{ namespace: 'ns', alias: 'ALIAS' }] })
            }),
            expect.anything()
        );
    });

    it('invokes handleRuntimeCrash when manifest merge fails', async () => {
        getVariantMock.mockResolvedValue(variant);
        getAdpConfigMock.mockResolvedValue({ target: {} as any, ignoreCertErrors: false } as any);
        getAdpProjectDataMock.mockResolvedValue(projectData);

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
        // Mock dependencies
        getVariantMock.mockResolvedValue(variant);
        getAdpConfigMock.mockResolvedValue({ target: {} as any, ignoreCertErrors: false } as any);
        getAdpProjectDataMock.mockResolvedValue(projectData);

        // Force SystemLookup.getSystemRequiresAuth to reject
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
});
