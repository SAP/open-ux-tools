import { jest } from '@jest/globals';
import { ConsoleTransport, LogLevel, ToolsLogger } from '@sap-ux/logger';
import { createApplicationAccess, FileName, getSpecificationModuleFromCache } from '@sap-ux/project-access';
import type { Specification } from '@sap/ux-specification/dist/types/src';
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const mockExecNpmCommand = jest.fn<(...args: unknown[]) => Promise<string>>();
const mockWriteFile = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockReadJSON = jest.fn<(...args: unknown[]) => Promise<unknown>>();

jest.unstable_mockModule('@sap-ux/project-access/dist/command', () => ({
    execNpmCommand: mockExecNpmCommand
}));

const actualFile = await import('@sap-ux/project-access/dist/file');
jest.unstable_mockModule('@sap-ux/project-access/dist/file', () => ({
    ...actualFile,
    readJSON: mockReadJSON,
    writeFile: mockWriteFile
}));

jest.unstable_mockModule('../../src/telemetry', () => ({
    TelemetryHelper: {
        initTelemetrySettings: jest.fn().mockResolvedValue(undefined),
        sendTelemetry: jest.fn().mockResolvedValue(undefined)
    }
}));

const { createEntityChoices } = await import('../../src/data-download/prompts/prompt-helpers');
const { getEntityModel } = await import('../../src/data-download/utils');

import type { ReferencedEntities } from '../../src/data-download/types';

const __testdir = dirname(fileURLToPath(import.meta.url));

describe('Test createEntityChoices - integration', () => {
    it('should create entity set choices based on app model (from specification)', async () => {
        mockExecNpmCommand.mockResolvedValueOnce('{"latest": "1.142.1"}');
        mockWriteFile.mockResolvedValueOnce();

        mockReadJSON.mockImplementation(async (path) => {
            if ((path as string).endsWith(FileName.SpecificationDistTags)) {
                return {
                    latest: '1.142.1'
                };
            }
            return JSON.parse(await readFile(path as string, 'utf8'));
        });

        const appPath = join(__testdir, '../test-data/test-apps/travel');
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
    }, 900000);
});
