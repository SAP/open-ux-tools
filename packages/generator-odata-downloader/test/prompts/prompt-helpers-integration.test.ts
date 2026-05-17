import { jest } from '@jest/globals';
import { ConsoleTransport, LogLevel, ToolsLogger } from '@sap-ux/logger';
import { createApplicationAccess, getSpecificationModuleFromCache } from '@sap-ux/project-access';
import type { Specification } from '@sap/ux-specification/dist/types/src';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ReferencedEntities } from '../../src/data-download/types.js';
import { getEntityModel } from '../../src/data-download/utils.js';
import { initI18nODataDownloadGenerator } from '../../src/utils/i18n.js';

jest.unstable_mockModule('../../src/telemetry', () => ({
    TelemetryHelper: {
        initTelemetrySettings: jest.fn().mockResolvedValue(undefined),
        sendTelemetry: jest.fn().mockResolvedValue(undefined)
    }
}));

const { createEntityChoices } = await import('../../src/data-download/prompts/prompt-helpers.js');

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('Test createEntityChoices (integration)', () => {
    beforeAll(async () => {
        await initI18nODataDownloadGenerator();
    });

    it('should create entity set choices based on app model (from specification)', async () => {
        const appPath = join(__dirname, '../test-data/test-apps/travel');
        const appAccess = await createApplicationAccess(appPath);
        const metadata = await readFile(join(appPath, '/webapp/localService/mainService/metadata.xml'), 'utf8');

        const logger = new ToolsLogger({ logLevel: LogLevel.Debug, transports: [new ConsoleTransport()] });
        const specResult = await getSpecificationModuleFromCache(appAccess.app.appRoot, { logger });

        if (typeof specResult === 'string') {
            throw new Error(specResult);
        }

        const entityModel = await getEntityModel(appAccess, specResult as Specification, metadata);
        expect(entityModel).not.toBe(String);
        expect(entityModel).not.toBe(undefined);

        const entityChoices = createEntityChoices(
            (entityModel! as ReferencedEntities).listEntity,
            (entityModel! as ReferencedEntities)?.pageObjectEntities
        );
        expect(entityChoices).toMatchSnapshot();
    }, 900000); // Very long spec load time on Windows
});
