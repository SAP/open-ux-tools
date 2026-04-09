import { jest } from '@jest/globals';
import fs from 'node:fs';
import { join, resolve } from 'node:path';
import yeomanTest from 'yeoman-test';

import type { NewModelAnswers, DescriptorVariant } from '@sap-ux/adp-tooling';

const mockGenerateChange = jest.fn();
const mockGetVariant = jest.fn();

const realAdpTooling = await import('@sap-ux/adp-tooling');
jest.unstable_mockModule('@sap-ux/adp-tooling', () => ({
    ...realAdpTooling,
    generateChange: mockGenerateChange,
    getVariant: mockGetVariant
}));

const { default: newModelGen } = await import('../../../src/add-new-model');

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

const generatorPath = join(globalThis.__dirname, 'src/add-new-model/index.ts');
const tmpDir = resolve(globalThis.__dirname, 'test-output-add-new-model');
const originalCwd: string = process.cwd();

describe('AddNewModelGenerator', () => {
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

        expect(mockGenerateChange).toHaveBeenCalledWith(
            tmpDir,
            realAdpTooling.ChangeType.ADD_NEW_MODEL,
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
});
