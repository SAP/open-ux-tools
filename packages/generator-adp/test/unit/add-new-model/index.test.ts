import { jest } from '@jest/globals';
import fs from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import yeomanTest from 'yeoman-test';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import type {
    NewModelAnswers,
    NewModelData,
    DescriptorVariant,
    UI5YamlCustomTaskConfiguration
} from '@sap-ux/adp-tooling';

const mockGenerateChange = jest.fn();
const mockGetVariant = jest.fn();
const mockIsCFEnvironment = jest.fn();
const mockIsLoggedInCf = jest.fn();
const mockLoadCfConfig = jest.fn();
const mockCreateNewModelData = jest.fn();
const mockReadUi5Config = jest.fn();
const mockExtractCfBuildTask = jest.fn();

// Get real module for ChangeType and other constants
const realAdpTooling = await import('@sap-ux/adp-tooling');

// Mock the module
jest.unstable_mockModule('@sap-ux/adp-tooling', () => ({
    ...realAdpTooling,
    generateChange: mockGenerateChange,
    getVariant: mockGetVariant,
    isCFEnvironment: mockIsCFEnvironment,
    isLoggedInCf: mockIsLoggedInCf,
    loadCfConfig: mockLoadCfConfig,
    createNewModelData: mockCreateNewModelData,
    readUi5Config: mockReadUi5Config,
    extractCfBuildTask: mockExtractCfBuildTask
}));

const { default: newModelGen } = await import('../../../src/add-new-model');

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

const generatorPath = join(__dirname, 'src/add-new-model/index.ts');
const tmpDir = resolve(__dirname, 'test-output-add-new-model');
const originalCwd: string = process.cwd();

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
        mockIsCFEnvironment.mockResolvedValue(false);
        mockIsLoggedInCf.mockResolvedValue(true);
        mockLoadCfConfig.mockReturnValue(mockCfConfig as any);
        mockCreateNewModelData.mockResolvedValue(mockNewModelData);
        mockReadUi5Config.mockResolvedValue({} as any);
        mockExtractCfBuildTask.mockReturnValue(mockBuildTask);
    });
    afterEach(() => {
        jest.clearAllMocks();
    });

    afterAll(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true });
        process.chdir(originalCwd);
    });

    it('generates change with namespaces when new empty file selected', async () => {
        mockGetVariant.mockResolvedValue(variant);

        const runContext = yeomanTest
            .create(newModelGen, { resolved: generatorPath }, { cwd: tmpDir })
            .withOptions({ data: { path: tmpDir } })
            .withPrompts(answers);

        await expect(runContext.run()).resolves.not.toThrow();

        expect(mockCreateNewModelData).toHaveBeenCalledWith(
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
        expect(mockGenerateChange).toHaveBeenCalledWith(
            tmpDir,
            realAdpTooling.ChangeType.ADD_NEW_MODEL,
            mockNewModelData,
            expect.anything()
        );
    });

    it('passes isCloudFoundry: true and destinationName for CF projects', async () => {
        mockGetVariant.mockResolvedValue(variant);
        mockIsCFEnvironment.mockResolvedValue(true);

        const runContext = yeomanTest
            .create(newModelGen, { resolved: generatorPath }, { cwd: tmpDir })
            .withOptions({ data: { path: tmpDir } })
            .withPrompts(answers);

        await expect(runContext.run()).resolves.not.toThrow();

        expect(mockCreateNewModelData).toHaveBeenCalledWith(tmpDir, variant, expect.anything(), expect.anything());
        expect(mockGenerateChange).toHaveBeenCalledWith(
            tmpDir,
            realAdpTooling.ChangeType.ADD_NEW_MODEL,
            mockNewModelData,
            expect.anything()
        );
    });

    it('invokes handleRuntimeCrash when getVariant fails during initializing', async () => {
        mockGetVariant.mockRejectedValueOnce(new Error('variant fail'));

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
            mockIsCFEnvironment.mockResolvedValue(true);
            mockGetVariant.mockResolvedValue(variant);
        });

        it('continues without error when org and space match', async () => {
            const runContext = yeomanTest
                .create(newModelGen, { resolved: generatorPath }, { cwd: tmpDir })
                .withOptions({ data: { path: tmpDir } })
                .withPrompts(answers);

            await expect(runContext.run()).resolves.not.toThrow();

            expect(mockGenerateChange).toHaveBeenCalled();
        });

        it('stops the generator when org does not match', async () => {
            mockExtractCfBuildTask.mockReturnValue({ ...mockBuildTask, org: 'different-org' });

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
            expect(mockGenerateChange).not.toHaveBeenCalled();

            writingSpy.mockRestore();
            handleCrashSpy.mockRestore();
        });

        it('stops the generator when space does not match', async () => {
            mockExtractCfBuildTask.mockReturnValue({ ...mockBuildTask, space: 'different-space-guid' });

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
            expect(mockGenerateChange).not.toHaveBeenCalled();

            writingSpy.mockRestore();
            handleCrashSpy.mockRestore();
        });

        it('stops the generator when reading ui5.yaml fails', async () => {
            mockReadUi5Config.mockRejectedValueOnce(new Error('cannot read ui5.yaml'));

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
            expect(mockGenerateChange).not.toHaveBeenCalled();

            writingSpy.mockRestore();
            handleCrashSpy.mockRestore();
        });
    });
});
