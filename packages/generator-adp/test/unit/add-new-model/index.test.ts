import fs from 'fs';
import { join, resolve } from 'path';
import yeomanTest from 'yeoman-test';

import { ChangeType, generateChange, getVariant } from '@sap-ux/adp-tooling';
import type { NewModelAnswers, DescriptorVariant } from '@sap-ux/adp-tooling';

import newModelGen from '../../../src/add-new-model';

jest.mock('@sap-ux/adp-tooling', () => ({
    ...jest.requireActual('@sap-ux/adp-tooling'),
    generateChange: jest.fn(),
    getVariant: jest.fn()
}));

const generateChangeMock = generateChange as jest.MockedFunction<typeof generateChange>;
const getVariantMock = getVariant as jest.MockedFunction<typeof getVariant>;

const variant = {
    reference: 'customer.adp.variant',
    id: 'customer.adp.variant',
    layer: 'CUSTOMER_BASE',
    namespace: 'apps/fin.test.appvar.av1/appVariants/customer.adp.variant/'
} as DescriptorVariant;

const answers: NewModelAnswers & { errorMessagePrompt: string } = {
    name: 'OData_ServiceName',
    uri: '/sap/opu/odata/some-name',
    modelName: 'OData_ServiceModelName',
    version: '4.0',
    modelSettings: '{}',
    addAnnotationMode: false,
    errorMessagePrompt: 'failed'
};

const generatorPath = join(__dirname, '../../src/add-new-model/index.ts');
const tmpDir = resolve(__dirname, 'test-output');
const originalCwd: string = process.cwd(); // Generation changes the cwd, this breaks sonar report so we restore later

describe('AddNewModelGenerator', () => {
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
                service: {
                    name: answers.name,
                    uri: answers.uri,
                    modelName: answers.modelName,
                    version: answers.version,
                    modelSettings: answers.modelSettings
                }
            }),
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
});
