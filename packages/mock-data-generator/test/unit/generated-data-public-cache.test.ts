import { createHash } from 'node:crypto';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
    createGenerationFingerprint,
    generateService,
    readGeneratedDataCache,
    writeGeneratedDataCache,
    type MockDataServiceRequest,
    type SemanticClassifier
} from '../../src/index.js';
import { writeGeneratedDataCache as writeUncheckedCacheEntry } from '../../src/cache/generated-data.js';

const request: MockDataServiceRequest = {
    metadata: {
        format: 'edmx',
        content: `<edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
            <edmx:DataServices>
                <Schema Namespace="Demo" xmlns="http://docs.oasis-open.org/odata/ns/edm">
                    <EntityContainer Name="Container"><EntitySet Name="Records" EntityType="Demo.Record" /></EntityContainer>
                    <EntityType Name="Record">
                        <Key><PropertyRef Name="ID" /></Key>
                        <Property Name="ID" Type="Edm.Int32" Nullable="false" />
                        <Property Name="Name" Type="Edm.String" Nullable="false" MaxLength="40" />
                    </EntityType>
                </Schema>
            </edmx:DataServices>
        </edmx:Edmx>`
    },
    service: { urlPath: '/records', odataVersion: '4.0' },
    targets: [{ name: 'Records', kind: 'entity-set' }],
    existingData: {}
};
const options = { pipeline: 'semantic-v2' as const, mode: 'deterministic' as const, seed: 17, rowsPerEntity: 1 };

describe('request-bound generated-data cache source API', () => {
    let cacheRoot: string;

    beforeEach(async () => {
        cacheRoot = await mkdtemp(join(tmpdir(), 'mockgen-request-cache-'));
    });

    afterEach(async () => {
        await rm(cacheRoot, { recursive: true, force: true });
    });

    test('returns a valid result only for the exact request and options', async () => {
        const generated = await generateService(request, options);
        await writeGeneratedDataCache(cacheRoot, request, options, generated);

        await expect(readGeneratedDataCache(cacheRoot, request, options)).resolves.toEqual(generated);
        await expect(readGeneratedDataCache(cacheRoot, request, { ...options, seed: 18 })).resolves.toBeUndefined();
        await expect(
            readGeneratedDataCache(
                cacheRoot,
                { ...request, service: { ...request.service, urlPath: '/other' } },
                options
            )
        ).resolves.toBeUndefined();
    });

    test('refuses to publish a value that fails current schema validation', async () => {
        const generated = await generateService(request, options);
        const invalid = {
            ...generated,
            resources: { Records: [{ ...generated.resources.Records?.[0], ID: 'not-an-integer' }] }
        };

        await expect(writeGeneratedDataCache(cacheRoot, request, options, invalid)).rejects.toThrow();
        await expect(readdir(cacheRoot)).resolves.toEqual([]);
    });

    test('quarantines a structurally valid snapshot that violates the current schema', async () => {
        const generated = await generateService(request, options);
        const key = createGenerationFingerprint(request, options);
        await writeUncheckedCacheEntry(
            cacheRoot,
            key,
            {
                ...generated,
                resources: { Records: [{ ...generated.resources.Records?.[0], ID: 'not-an-integer' }] }
            },
            { validate: () => undefined }
        );

        await expect(readGeneratedDataCache(cacheRoot, request, options)).resolves.toBeUndefined();
        expect(await readdir(cacheRoot)).not.toContain(`${key}.json`);
    });

    test('rejects a snapshot whose reported component identity differs from the current runtime', async () => {
        const generated = await generateService(request, options);

        await expect(
            writeGeneratedDataCache(cacheRoot, request, options, {
                ...generated,
                fingerprints: { ...generated.fingerprints, classifier: 'foreign-head' }
            })
        ).rejects.toThrow('component identity');
        await expect(readdir(cacheRoot)).resolves.toEqual([]);
    });

    test('rejects a semantic snapshot that self-abstains to conceal an invalid value', async () => {
        const ibanRequest = {
            ...request,
            metadata: {
                ...request.metadata,
                content: request.metadata.content.replace('Name="Name"', 'Name="IBAN"')
            }
        };
        const ibanOptions = {
            ...options,
            syntheticScenario: { id: 'synthetic-de-accounts', version: '1', domains: {}, ibanCountry: 'DE' }
        };
        const generated = await generateService(ibanRequest, ibanOptions);
        expect(generated.semanticRoles).toMatchObject({ 'Records.IBAN': 'iban' });
        const hiddenRoles = {};
        const tampered = {
            ...generated,
            resources: { Records: [{ ...generated.resources.Records?.[0], IBAN: 'DE00000000000000000000' }] },
            semanticRoles: hiddenRoles,
            semanticPlanFingerprint: createHash('sha256')
                .update(JSON.stringify({ request: generated.fingerprints.request, roles: hiddenRoles }))
                .digest('hex')
        };

        await expect(writeGeneratedDataCache(cacheRoot, ibanRequest, ibanOptions, tampered)).rejects.toThrow(
            'semantic roles'
        );
        await expect(readdir(cacheRoot)).resolves.toEqual([]);
        const key = createGenerationFingerprint(ibanRequest, ibanOptions);
        await writeUncheckedCacheEntry(cacheRoot, key, tampered, { validate: () => undefined });
        await expect(readGeneratedDataCache(cacheRoot, ibanRequest, ibanOptions)).resolves.toBeUndefined();
        expect(await readdir(cacheRoot)).not.toContain(`${key}.json`);
    });

    test('rejects a snapshot that replaces authored application evidence', async () => {
        const authoredRequest: MockDataServiceRequest = {
            ...request,
            existingData: {
                Records: {
                    contributor: { present: false },
                    initialRows: { source: 'json', present: true, rows: [{ ID: 99, Name: 'Human' }] }
                }
            }
        };
        const generated = await generateService(authoredRequest, options);
        expect(generated.resources.Records?.[0]).toMatchObject({ ID: 99, Name: 'Human' });

        await expect(
            writeGeneratedDataCache(cacheRoot, authoredRequest, options, {
                ...generated,
                resources: { Records: [{ ID: 1, Name: 'Synthetic' }] }
            })
        ).rejects.toThrow('Authored evidence');
        await expect(readdir(cacheRoot)).resolves.toEqual([]);
        const key = createGenerationFingerprint(authoredRequest, options);
        await writeUncheckedCacheEntry(
            cacheRoot,
            key,
            { ...generated, resources: { Records: [{ ID: 1, Name: 'Synthetic' }] } },
            { validate: () => undefined }
        );
        await expect(readGeneratedDataCache(cacheRoot, authoredRequest, options)).resolves.toBeUndefined();
        expect(await readdir(cacheRoot)).not.toContain(`${key}.json`);
    });

    test('rejects a cache snapshot when its model identity differs from the active runtime', async () => {
        const automaticOptions = { ...options, mode: 'auto' as const };
        const generated = await generateService(request, automaticOptions);
        await writeGeneratedDataCache(cacheRoot, request, automaticOptions, generated);

        const classifier = {
            fingerprint: 'changed-head',
            classify: async () => ({ role: 'unknown' as const, confidence: 1, source: 'unknown' as const, top: [] })
        };
        await expect(
            readGeneratedDataCache(cacheRoot, request, automaticOptions, { classifier })
        ).resolves.toBeUndefined();
    });

    test('rejects invalid generation options and cancellation before cache access', async () => {
        const generated = await generateService(request, options);
        await expect(
            writeGeneratedDataCache(cacheRoot, request, { ...options, rowsPerEntity: -1 }, generated)
        ).rejects.toThrow('row counts');
        const controller = new AbortController();
        controller.abort();
        await expect(
            readGeneratedDataCache(cacheRoot, { ...request, signal: controller.signal }, options)
        ).rejects.toMatchObject({ name: 'AbortError' });
        await expect(readdir(cacheRoot)).resolves.toEqual([]);
    });

    test('keeps a valid entry on classifier degradation or cancellation during role validation', async () => {
        let classifierState: 'ready' | 'degraded' | 'abort' = 'ready';
        const controller = new AbortController();
        const classifier: SemanticClassifier = {
            fingerprint: 'stable-classifier-head',
            classify: async () => {
                if (classifierState === 'degraded') {
                    throw new Error('temporary classifier failure');
                }
                if (classifierState === 'abort') {
                    controller.abort();
                    controller.signal.throwIfAborted();
                }
                return {
                    role: 'unknown',
                    confidence: 1,
                    source: 'unknown',
                    top: [{ role: 'unknown', confidence: 1 }]
                };
            }
        };
        const automaticOptions = { ...options, mode: 'auto' as const };
        const generated = await generateService(request, automaticOptions, { classifier });
        await writeGeneratedDataCache(cacheRoot, request, automaticOptions, generated, { classifier });
        const key = createGenerationFingerprint(request, automaticOptions, { classifier: classifier.fingerprint });

        classifierState = 'degraded';
        await expect(
            readGeneratedDataCache(cacheRoot, request, automaticOptions, { classifier })
        ).resolves.toBeUndefined();
        expect(await readdir(cacheRoot)).toContain(`${key}.json`);

        classifierState = 'abort';
        await expect(
            readGeneratedDataCache(cacheRoot, { ...request, signal: controller.signal }, automaticOptions, {
                classifier
            })
        ).rejects.toMatchObject({ name: 'AbortError' });
        expect(await readdir(cacheRoot)).toContain(`${key}.json`);
    });
});
