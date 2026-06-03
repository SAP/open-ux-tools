import { FioriAppGenerator } from '../../../src/fiori-app-generator/fioriAppGenerator';
import { initI18nFioriAppSubGenerator } from '../../../src/utils/i18n';

export class TestWritingGenerator extends FioriAppGenerator {
    async initializing(): Promise<void> {
        // Ensure i18n bundles are loaded for tests
        await initI18nFioriAppSubGenerator();
    }

    async writing(): Promise<void> {
        return super.writing();
    }
}

/**
 * Creates a TestWritingGenerator class using dynamic imports.
 * This is needed for ESM test files that use jest.unstable_mockModule,
 * since mocks must be registered before the modules are loaded.
 */
export async function createTestWritingGeneratorClass(): Promise<typeof TestWritingGenerator> {
    const { FioriAppGenerator: FioriAppGen } = await import('../../../src/fiori-app-generator/fioriAppGenerator');
    const { initI18nFioriAppSubGenerator: initI18n } = await import('../../../src/utils/i18n');

    return class DynamicTestWritingGenerator extends FioriAppGen {
        async initializing(): Promise<void> {
            await initI18n();
        }
        async writing(): Promise<void> {
            return super.writing();
        }
    } as unknown as typeof TestWritingGenerator;
}
