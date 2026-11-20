import { copyFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createMockDataGenerator } from '../../src/standalone.js';

// This file runs in its own module registry, so its first session is the first of the process.

const PACKAGE_RESOURCES = fileURLToPath(new URL('../../resources', import.meta.url));

const METADATA = `<?xml version="1.0" encoding="utf-8"?><edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx"><edmx:DataServices><Schema Namespace="Demo" xmlns="http://docs.oasis-open.org/odata/ns/edm">
<EntityType Name="Order"><Key><PropertyRef Name="ID"/></Key><Property Name="ID" Type="Edm.Int32" Nullable="false"/></EntityType>
<EntityContainer Name="Container"><EntitySet Name="Orders" EntityType="Demo.Order"/></EntityContainer></Schema></edmx:DataServices></edmx:Edmx>`;

describe('a first session on a resource root that fails verification', () => {
    let incomplete: string;

    beforeAll(async () => {
        incomplete = await mkdtemp(join(tmpdir(), 'mockgen-rejected-root-'));
        await mkdir(join(incomplete, 'models'));
        await copyFile(join(PACKAGE_RESOURCES, 'models/manifest.json'), join(incomplete, 'models/manifest.json'));
    });

    afterAll(async () => {
        await rm(incomplete, { recursive: true, force: true });
    });

    it('does not keep later sessions on the package resources from generating', async () => {
        // Given a first session on a copy that holds the manifest but none of its data files
        await expect(createMockDataGenerator({ resourceRoot: incomplete })).rejects.toMatchObject({
            code: 'RESOURCE_INTEGRITY'
        });

        // When a later session uses the package's own resources
        const generator = await createMockDataGenerator();
        const result = await generator.generateService(
            {
                metadata: { format: 'edmx', content: METADATA },
                service: { urlPath: '/demo', odataVersion: '4.0' },
                targets: [{ name: 'Orders', kind: 'entity-set' }],
                existingData: {}
            },
            { mode: 'deterministic', seed: 1, rowsPerEntity: 2 }
        );
        await generator.dispose();

        // Then it generates
        expect(result.resources.Orders).toHaveLength(2);
    });
});
