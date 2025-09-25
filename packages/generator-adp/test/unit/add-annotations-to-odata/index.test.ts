import fs from 'fs';
import { join, resolve } from 'path';
import yeomanTest from 'yeoman-test';

import {
    ChangeType,
    generateChange,
    getAdpConfig,
    getVariant,
    ManifestService,
    SystemLookup,
    AnnotationFileSelectType
} from '@sap-ux/adp-tooling';
import { getTemplatesOverwritePath } from '../../../src/utils/templates';
import type { Manifest } from '@sap-ux/project-access';
import type { AbapTarget } from '@sap-ux/system-access';
import type { DescriptorVariant } from '@sap-ux/adp-tooling';

import annotationGen from '../../../src/add-annotations-to-odata';

jest.mock('@sap-ux/adp-tooling', () => ({
    ...jest.requireActual('@sap-ux/adp-tooling'),
    generateChange: jest.fn(),
    getVariant: jest.fn(),
    getAdpConfig: jest.fn(),
    getAdpProjectData: jest.fn()
}));

jest.mock('../../../src/utils/templates', () => ({
    getTemplatesOverwritePath: jest.fn(() => join(__dirname, '../../../src/add-annotations-to-odata/templates'))
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

const generatorPath = join(__dirname, '../../src/add-annotations-to-odata/index.ts');
const tmpDir = resolve(__dirname, 'test-output');
const originalCwd: string = process.cwd(); // Generation changes the cwd, this breaks sonar report so we restore later

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

        getVariantMock.mockResolvedValue(variant);
        getAdpConfigMock.mockResolvedValue({ target, ignoreCertErrors: false } as any);

        const runContext = yeomanTest
            .create(annotationGen, { resolved: generatorPath }, { cwd: tmpDir })
            .withOptions({ data: { path: tmpDir } })
            .withPrompts(answers);

        await expect(runContext.run()).resolves.not.toThrow();

        expect(generateChangeMock).toHaveBeenCalledWith(
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
            expect.stringContaining(join(__dirname, '../../../src/add-annotations-to-odata', 'templates'))
        );
    });

    it('invokes handleRuntimeCrash when manifest merge fails', async () => {
        getVariantMock.mockResolvedValue(variant);
        getAdpConfigMock.mockResolvedValue({ target, ignoreCertErrors: false } as any);

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
        getVariantMock.mockResolvedValue(variant);
        getAdpConfigMock.mockResolvedValue({ target, ignoreCertErrors: false } as any);

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
