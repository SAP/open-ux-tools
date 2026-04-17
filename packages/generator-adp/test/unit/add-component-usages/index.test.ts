import { jest } from '@jest/globals';
import fs from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import yeomanTest from 'yeoman-test';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import type { AddComponentUsageAnswers, DescriptorVariant } from '@sap-ux/adp-tooling';

const mockGenerateChange = jest.fn();
const mockGetVariant = jest.fn();

const realAdpTooling = await import('@sap-ux/adp-tooling');
jest.unstable_mockModule('@sap-ux/adp-tooling', () => ({
    ...realAdpTooling,
    generateChange: mockGenerateChange,
    getVariant: mockGetVariant
}));

const { default: componentUsagesGen } = await import('../../../src/add-component-usages');

const variant = {
    reference: 'customer.adp.variant',
    id: 'customer.adp.variant',
    layer: 'CUSTOMER_BASE',
    namespace: 'apps/fin.test.appvar.av1/appVariants/customer.adp.variant/'
} as DescriptorVariant;

const answers: AddComponentUsageAnswers & { errorMessagePrompt: string } = {
    usageId: 'customer.myUsage',
    name: 'my.Component',
    isLazy: 'false',
    settings: '{}',
    data: '{}',
    shouldAddLibrary: false,
    errorMessagePrompt: 'failed'
};

const generatorPath = join(__dirname, 'src/add-component-usages/index.ts');
const tmpDir = resolve(__dirname, 'test-output-add-component-usages');
const originalCwd: string = process.cwd();

describe('AddComponentUsagesGenerator', () => {
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
            .create(componentUsagesGen, { resolved: generatorPath }, { cwd: tmpDir })
            .withOptions({ data: { path: tmpDir } })
            .withPrompts(answers);

        await expect(runContext.run()).resolves.not.toThrow();

        expect(mockGenerateChange).toHaveBeenCalledWith(
            tmpDir,
            realAdpTooling.ChangeType.ADD_COMPONENT_USAGES,
            expect.objectContaining({
                component: {
                    usageId: answers.usageId,
                    name: answers.name,
                    isLazy: answers.isLazy,
                    settings: answers.settings,
                    data: answers.data
                }
            }),
            expect.anything()
        );
    });

    it('invokes handleRuntimeCrash when getVariant fails during initializing', async () => {
        mockGetVariant.mockRejectedValueOnce(new Error('variant fail'));

        const handleCrashSpy = jest
            .spyOn((componentUsagesGen as any).prototype, 'handleRuntimeCrash')
            .mockResolvedValueOnce(undefined);

        const writingSpy = jest
            .spyOn((componentUsagesGen as any).prototype, 'writing')
            .mockImplementation(async () => undefined);

        const runContext = yeomanTest
            .create(componentUsagesGen, { resolved: generatorPath }, { cwd: tmpDir })
            .withOptions({ data: { path: tmpDir } })
            .withPrompts(answers);

        await expect(runContext.run()).resolves.not.toThrow();

        expect(handleCrashSpy).toHaveBeenCalledWith('variant fail');

        writingSpy.mockRestore();
        handleCrashSpy.mockRestore();
    });
});
