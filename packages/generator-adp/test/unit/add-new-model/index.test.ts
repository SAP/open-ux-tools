import fs from 'node:fs';
import { join, resolve } from 'node:path';
import yeomanTest from 'yeoman-test';

import {
    ChangeType,
    generateChange,
    getVariant,
    isCFEnvironment,
    runBuild,
    isLoggedInCf,
    loadCfConfig,
    downloadUi5AppInfo
} from '@sap-ux/adp-tooling';
import type { NewModelAnswers, DescriptorVariant } from '@sap-ux/adp-tooling';

import newModelGen from '../../../src/add-new-model';

jest.mock('@sap-ux/adp-tooling', () => ({
    ...jest.requireActual('@sap-ux/adp-tooling'),
    generateChange: jest.fn(),
    getVariant: jest.fn(),
    isCFEnvironment: jest.fn(),
    runBuild: jest.fn(),
    isLoggedInCf: jest.fn(),
    loadCfConfig: jest.fn(),
    downloadUi5AppInfo: jest.fn()
}));

jest.mock('../../../src/utils/deps', () => ({
    installDependencies: jest.fn()
}));

import { installDependencies } from '../../../src/utils/deps';

const generateChangeMock = generateChange as jest.MockedFunction<typeof generateChange>;
const getVariantMock = getVariant as jest.MockedFunction<typeof getVariant>;
const isCFEnvironmentMock = isCFEnvironment as jest.MockedFunction<typeof isCFEnvironment>;
const runBuildMock = runBuild as jest.MockedFunction<typeof runBuild>;
const isLoggedInCfMock = isLoggedInCf as jest.MockedFunction<typeof isLoggedInCf>;
const loadCfConfigMock = loadCfConfig as jest.MockedFunction<typeof loadCfConfig>;
const downloadUi5AppInfoMock = downloadUi5AppInfo as jest.MockedFunction<typeof downloadUi5AppInfo>;
const installDependenciesMock = installDependencies as jest.MockedFunction<typeof installDependencies>;

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

const generatorPath = join(__dirname, '../../src/add-new-model/index.ts');
const tmpDir = resolve(__dirname, 'test-output');
const originalCwd: string = process.cwd(); // Generation changes the cwd, this breaks sonar report so we restore later

describe('AddNewModelGenerator', () => {
    const mockCfConfig = { url: 'cf.example.com', token: 'token' };

    beforeEach(() => {
        isCFEnvironmentMock.mockResolvedValue(false);
        isLoggedInCfMock.mockResolvedValue(true);
        loadCfConfigMock.mockReturnValue(mockCfConfig as any);
        runBuildMock.mockResolvedValue(undefined);
        downloadUi5AppInfoMock.mockResolvedValue(undefined);
        installDependenciesMock.mockResolvedValue(undefined);
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

        expect(generateChangeMock).toHaveBeenCalledWith(
            tmpDir,
            ChangeType.ADD_NEW_MODEL,
            expect.objectContaining({
                isCloudFoundry: false,
                service: {
                    name: answers.modelAndDatasourceName,
                    uri: answers.uri,
                    modelName: answers.modelAndDatasourceName,
                    version: '2.0',
                    modelSettings: answers.modelSettings
                }
            }),
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

        expect(generateChangeMock).toHaveBeenCalledWith(
            tmpDir,
            ChangeType.ADD_NEW_MODEL,
            expect.objectContaining({ isCloudFoundry: true }),
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

    it('stores cfConfig once and calls downloadUi5AppInfo + runBuild with ADP_BUILDER_MODE=preview in end()', async () => {
        getVariantMock.mockResolvedValue(variant);
        isCFEnvironmentMock.mockResolvedValue(true);

        const runContext = yeomanTest
            .create(newModelGen, { resolved: generatorPath }, { cwd: tmpDir })
            .withOptions({ data: { path: tmpDir } })
            .withPrompts(answers);

        await expect(runContext.run()).resolves.not.toThrow();

        expect(loadCfConfigMock).toHaveBeenCalledTimes(1);
        expect(installDependenciesMock).toHaveBeenCalledWith(tmpDir);
        expect(downloadUi5AppInfoMock).toHaveBeenCalledWith(tmpDir, mockCfConfig, expect.anything());
        expect(runBuildMock).toHaveBeenCalledWith(tmpDir, { ADP_BUILDER_MODE: 'preview' });
    });

    it('does not call downloadUi5AppInfo or runBuild for non-CF projects', async () => {
        getVariantMock.mockResolvedValue(variant);
        isCFEnvironmentMock.mockResolvedValue(false);

        const runContext = yeomanTest
            .create(newModelGen, { resolved: generatorPath }, { cwd: tmpDir })
            .withOptions({ data: { path: tmpDir } })
            .withPrompts(answers);

        await expect(runContext.run()).resolves.not.toThrow();

        expect(downloadUi5AppInfoMock).not.toHaveBeenCalled();
        expect(runBuildMock).not.toHaveBeenCalled();
    });
});
