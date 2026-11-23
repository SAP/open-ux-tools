import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { createMemFsEditor } from '../../../src/utils/fs-adapter.js';
import { validateMetadata, xmlToJson } from '../../../src/utils/service.js';
import type { Manifest } from '../../../src/project-spec-types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('service - validateMetadata', () => {
    const testOutputDir = join(__dirname, '../../../test-output', 'service');

    beforeEach(async () => {
        await mkdir(testOutputDir, { recursive: true });
    });

    afterEach(async () => {
        await rm(testOutputDir, { recursive: true, force: true });
    });

    test('returns invalid config when no manifest is supplied', async () => {
        const result = await validateMetadata('/root', 'webapp', false, undefined, createMemFsEditor());
        expect(result).toEqual({ config: false, fileExists: false });
    });

    test('treats a SAP app with no dataSources as valid', async () => {
        const manifest = { 'sap.app': {} } as unknown as Manifest;
        const result = await validateMetadata('/root', 'webapp', true, manifest, createMemFsEditor());
        expect(result).toEqual({ config: true, fileExists: true });
    });

    test('returns invalid config for a non-SAP app with no dataSources', async () => {
        const manifest = { 'sap.app': {} } as unknown as Manifest;
        const result = await validateMetadata('/root', 'webapp', false, manifest, createMemFsEditor());
        expect(result).toEqual({ config: false, fileExists: false });
    });

    test('validates an OData datasource with a present local metadata file', async () => {
        const root = join(testOutputDir, 'with-metadata');
        const webapp = join(root, 'webapp', 'localService');
        await mkdir(webapp, { recursive: true });
        await writeFile(join(webapp, 'metadata.xml'), '<edmx:Edmx/>');
        const manifest = {
            'sap.app': {
                dataSources: {
                    mainService: {
                        type: 'OData',
                        settings: { localUri: join('localService', 'metadata.xml') }
                    }
                }
            }
        } as unknown as Manifest;
        const result = await validateMetadata(root, 'webapp', false, manifest, createMemFsEditor());
        expect(result.config).toBe(true);
        expect(result.fileExists).toBe(true);
    });

    test('reports a missing metadata file while config remains true', async () => {
        const root = join(testOutputDir, 'missing-metadata');
        await mkdir(root, { recursive: true });
        const manifest = {
            'sap.app': {
                dataSources: {
                    mainService: {
                        type: 'OData',
                        settings: { localUri: join('localService', 'metadata.xml') }
                    }
                }
            }
        } as unknown as Manifest;
        const result = await validateMetadata(root, 'webapp', false, manifest, createMemFsEditor());
        expect(result.config).toBe(true);
        expect(result.fileExists).toBe(false);
    });
});

describe('service - xmlToJson', () => {
    test('parses valid XML', () => {
        expect(xmlToJson('<root><child>a</child></root>')).toBeDefined();
    });
});
