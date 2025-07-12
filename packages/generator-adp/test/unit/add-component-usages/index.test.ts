import fs from 'fs';
import { join, resolve } from 'path';
import yeomanTest from 'yeoman-test';

import { ChangeType, generateChange, getVariant } from '@sap-ux/adp-tooling';
import type { AddComponentUsageAnswers, DescriptorVariant } from '@sap-ux/adp-tooling';

import componentUsagesGen from '../../../src/add-component-usages';

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

const answers: AddComponentUsageAnswers & { errorMessagePrompt: string } = {
    usageId: 'customer.myUsage',
    name: 'my.Component',
    isLazy: 'false',
    settings: '{}',
    data: '{}',
    shouldAddLibrary: false,
    errorMessagePrompt: 'failed'
};

const generatorPath = join(__dirname, '../../src/add-component-usages/index.ts');
const tmpDir = resolve(__dirname, 'test-output');
const originalCwd: string = process.cwd(); // Generation changes the cwd, this breaks sonar report so we restore later

describe('AddComponentUsagesGenerator', () => {
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
            .create(componentUsagesGen, { resolved: generatorPath }, { cwd: tmpDir })
            .withOptions({ data: { path: tmpDir } })
            .withPrompts(answers);

        await expect(runContext.run()).resolves.not.toThrow();

        expect(generateChangeMock).toHaveBeenCalledWith(
            tmpDir,
            ChangeType.ADD_COMPONENT_USAGES,
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
        getVariantMock.mockRejectedValueOnce(new Error('variant fail'));

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
