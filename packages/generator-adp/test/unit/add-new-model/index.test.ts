import fs from 'node:fs';
import { join, resolve } from 'node:path';
import yeomanTest from 'yeoman-test';

import {
    ChangeType,
    generateChange,
    getVariant,
    isCFEnvironment,
    isLoggedInCf,
    loadCfConfig,
    createNewModelData,
    readUi5Config,
    extractCfBuildTask
} from '@sap-ux/adp-tooling';
import type {
    NewModelAnswers,
    NewModelData,
    DescriptorVariant,
    UI5YamlCustomTaskConfiguration
} from '@sap-ux/adp-tooling';

import newModelGen from '../../../src/add-new-model';

jest.mock('@sap-ux/adp-tooling', () => ({
    ...jest.requireActual('@sap-ux/adp-tooling'),
    generateChange: jest.fn(),
    getVariant: jest.fn(),
    isCFEnvironment: jest.fn(),
    isLoggedInCf: jest.fn(),
    loadCfConfig: jest.fn(),
    createNewModelData: jest.fn(),
    readUi5Config: jest.fn(),
    extractCfBuildTask: jest.fn()
}));

const generateChangeMock = generateChange as jest.MockedFunction<typeof generateChange>;
const getVariantMock = getVariant as jest.MockedFunction<typeof getVariant>;
const isCFEnvironmentMock = isCFEnvironment as jest.MockedFunction<typeof isCFEnvironment>;
const isLoggedInCfMock = isLoggedInCf as jest.MockedFunction<typeof isLoggedInCf>;
const loadCfConfigMock = loadCfConfig as jest.MockedFunction<typeof loadCfConfig>;
const createNewModelDataMock = createNewModelData as jest.MockedFunction<typeof createNewModelData>;
const readUi5ConfigMock = readUi5Config as jest.MockedFunction<typeof readUi5Config>;
const extractCfBuildTaskMock = extractCfBuildTask as jest.MockedFunction<typeof extractCfBuildTask>;

const variant = {
    reference: 'customer.adp.variant',
    id: 'customer.adp.variant',
    layer: 'CUSTOMER_BASE',
    namespace: 'apps/fin.test.appvar.av1/appVariants/customer.adp.variant/'
} as DescriptorVariant;

const answers: NewModelAnswers & { errorMessagePrompt: string } = {
    modelAndDatasourceName: 'OData_ServiceName',
    uri: '/sap/opu/odata/some-name',
    serviceType: 'OData v2' as NewModelAnswers['serviceType'],
    modelSettings: '{}',
    addAnnotationMode: false,
    errorMessagePrompt: 'failed'
};

const mockNewModelData = { variant, isCloudFoundry: false } as unknown as NewModelData;

const generatorPath = join(__dirname, '../../src/add-new-model/index.ts');
const tmpDir = resolve(__dirname, 'test-output');
const originalCwd: string = process.cwd(); // Generation changes the cwd, this breaks sonar report so we restore later

const mockCfConfig = {
    url: 'cf.example.com',
    token: 'token',
    org: { Name: 'my-org', GUID: 'org-guid-123' },
    space: { Name: 'my-space', GUID: 'space-guid-456' }
};

const mockBuildTask = {
    org: 'org-guid-123',
    space: 'space-guid-456'
} as unknown as UI5YamlCustomTaskConfiguration;

describe('AddNewModelGenerator', () => {
    beforeEach(() => {
        isCFEnvironmentMock.mockResolvedValue(false);
        isLoggedInCfMock.mockResolvedValue(true);
        loadCfConfigMock.mockReturnValue(mockCfConfig as any);
        createNewModelDataMock.mockResolvedValue(mockNewModelData);
        readUi5ConfigMock.mockResolvedValue({} as any);
        extractCfBuildTaskMock.mockReturnValue(mockBuildTask);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    afterAll(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true });
        process.chdir(originalCwd);
    });

    it('generates change with namespaces when new empty file selected', async () => {
        getVariantMock.mockResolvedValue(variant);

        const runContext = yeomanTest
            .create(newModelGen, { resolved: generatorPath }, { cwd: tmpDir })
            .withOptions({ data: { path: tmpDir } })
            .withPrompts(answers);

        await expect(runContext.run()).resolves.not.toThrow();

        expect(createNewModelDataMock).toHaveBeenCalledWith(
            tmpDir,
            variant,
            expect.objectContaining({
                modelAndDatasourceName: answers.modelAndDatasourceName,
                uri: answers.uri,
                serviceType: answers.serviceType,
                modelSettings: answers.modelSettings,
                addAnnotationMode: answers.addAnnotationMode
            }),
            expect.anything()
        );
        expect(generateChangeMock).toHaveBeenCalledWith(
            tmpDir,
            ChangeType.ADD_NEW_MODEL,
            mockNewModelData,
            expect.anything()
        );
    });

    it('passes isCloudFoundry: true and destinationName for CF projects', async () => {
        getVariantMock.mockResolvedValue(variant);
        isCFEnvironmentMock.mockResolvedValue(true);

        const runContext = yeomanTest
            .create(newModelGen, { resolved: generatorPath }, { cwd: tmpDir })
            .withOptions({ data: { path: tmpDir } })
            .withPrompts(answers);

        await expect(runContext.run()).resolves.not.toThrow();

        expect(createNewModelDataMock).toHaveBeenCalledWith(tmpDir, variant, expect.anything(), expect.anything());
        expect(generateChangeMock).toHaveBeenCalledWith(
            tmpDir,
            ChangeType.ADD_NEW_MODEL,
            mockNewModelData,
            expect.anything()
        );
    });

    it('invokes handleRuntimeCrash when getVariant fails during initializing', async () => {
        getVariantMock.mockRejectedValueOnce(new Error('variant fail'));

        const handleCrashSpy = jest
            .spyOn((newModelGen as any).prototype, 'handleRuntimeCrash')
            .mockResolvedValueOnce(undefined);

        const writingSpy = jest
            .spyOn((newModelGen as any).prototype, 'writing')
            .mockImplementation(async () => undefined);

        const runContext = yeomanTest
            .create(newModelGen, { resolved: generatorPath }, { cwd: tmpDir })
            .withOptions({ data: { path: tmpDir } })
            .withPrompts(answers);

        await expect(runContext.run()).resolves.not.toThrow();

        expect(handleCrashSpy).toHaveBeenCalledWith('variant fail');

        writingSpy.mockRestore();
        handleCrashSpy.mockRestore();
    });

    describe('_checkCfTargetMismatch', () => {
        beforeEach(() => {
            isCFEnvironmentMock.mockResolvedValue(true);
            getVariantMock.mockResolvedValue(variant);
        });

        it('continues without error when org and space match', async () => {
            const runContext = yeomanTest
                .create(newModelGen, { resolved: generatorPath }, { cwd: tmpDir })
                .withOptions({ data: { path: tmpDir } })
                .withPrompts(answers);

            await expect(runContext.run()).resolves.not.toThrow();

            expect(generateChangeMock).toHaveBeenCalled();
        });

        it('stops the generator when org does not match', async () => {
            extractCfBuildTaskMock.mockReturnValue({ ...mockBuildTask, org: 'different-org' });

            const handleCrashSpy = jest
                .spyOn((newModelGen as any).prototype, 'handleRuntimeCrash')
                .mockResolvedValueOnce(undefined);
            const writingSpy = jest
                .spyOn((newModelGen as any).prototype, 'writing')
                .mockImplementation(async () => undefined);

            const runContext = yeomanTest
                .create(newModelGen, { resolved: generatorPath }, { cwd: tmpDir })
                .withOptions({ data: { path: tmpDir } })
                .withPrompts(answers);

            await expect(runContext.run()).resolves.not.toThrow();

            expect(handleCrashSpy).toHaveBeenCalled();
            expect(generateChangeMock).not.toHaveBeenCalled();

            writingSpy.mockRestore();
            handleCrashSpy.mockRestore();
        });

        it('stops the generator when space does not match', async () => {
            extractCfBuildTaskMock.mockReturnValue({ ...mockBuildTask, space: 'different-space-guid' });

            const handleCrashSpy = jest
                .spyOn((newModelGen as any).prototype, 'handleRuntimeCrash')
                .mockResolvedValueOnce(undefined);
            const writingSpy = jest
                .spyOn((newModelGen as any).prototype, 'writing')
                .mockImplementation(async () => undefined);

            const runContext = yeomanTest
                .create(newModelGen, { resolved: generatorPath }, { cwd: tmpDir })
                .withOptions({ data: { path: tmpDir } })
                .withPrompts(answers);

            await expect(runContext.run()).resolves.not.toThrow();

            expect(handleCrashSpy).toHaveBeenCalled();
            expect(generateChangeMock).not.toHaveBeenCalled();

            writingSpy.mockRestore();
            handleCrashSpy.mockRestore();
        });

        it('stops the generator when reading ui5.yaml fails', async () => {
            readUi5ConfigMock.mockRejectedValueOnce(new Error('cannot read ui5.yaml'));

            const handleCrashSpy = jest
                .spyOn((newModelGen as any).prototype, 'handleRuntimeCrash')
                .mockResolvedValueOnce(undefined);
            const writingSpy = jest
                .spyOn((newModelGen as any).prototype, 'writing')
                .mockImplementation(async () => undefined);

            const runContext = yeomanTest
                .create(newModelGen, { resolved: generatorPath }, { cwd: tmpDir })
                .withOptions({ data: { path: tmpDir } })
                .withPrompts(answers);

            await expect(runContext.run()).resolves.not.toThrow();

            expect(handleCrashSpy).toHaveBeenCalledWith('CF target mismatch check failed. Check the logs for details.');
            expect(generateChangeMock).not.toHaveBeenCalled();

            writingSpy.mockRestore();
            handleCrashSpy.mockRestore();
        });
    });
});
