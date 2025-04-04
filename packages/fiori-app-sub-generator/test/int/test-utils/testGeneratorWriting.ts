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
