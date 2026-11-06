import { copyFile, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createMockDataGenerator, getMockDataGeneratorInfo } from '../../src/standalone.js';
import type { MockDataServiceRequest } from '../../src/types.js';

const PACKAGE_RESOURCES = fileURLToPath(new URL('../../resources', import.meta.url));
/** The resource files a deterministic session reads: the manifest and the declared data resources. */
const DATA_RESOURCES = [
    'models/manifest.json',
    'banks/value-banks.v2.json',
    'rules/semantic-rules.v1.json',
    'rules/role-registry.v1.json'
];

const request: MockDataServiceRequest = {
    metadata: {
        format: 'edmx',
        content: `<?xml version="1.0"?>
<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0">
  <edmx:DataServices><Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="Demo">
    <EntityType Name="Record"><Key><PropertyRef Name="ID"/></Key>
      <Property Name="ID" Type="Edm.Int32" Nullable="false"/>
      <Property Name="City" Type="Edm.String" MaxLength="40"/>
    </EntityType>
    <EntityContainer Name="Container"><EntitySet Name="Records" EntityType="Demo.Record"/></EntityContainer>
  </Schema></edmx:DataServices>
</edmx:Edmx>`
    },
    service: { urlPath: '/records', odataVersion: '4.0' },
    targets: [{ name: 'Records', kind: 'entity-set' }],
    existingData: {}
};

describe('resource root option', () => {
    let resourceRoot: string;

    beforeEach(async () => {
        // Given a host that copied the shipped data resources and the manifest to its own directory
        resourceRoot = await mkdtemp(join(tmpdir(), 'mockgen-resource-root-'));
        for (const path of DATA_RESOURCES) {
            await mkdir(join(resourceRoot, path, '..'), { recursive: true });
            await copyFile(join(PACKAGE_RESOURCES, path), join(resourceRoot, path));
        }
    });

    afterEach(async () => {
        await rm(resourceRoot, { recursive: true, force: true });
    });

    it('reads the manifest from the resource root and generates deterministically', async () => {
        // When a session is created on that root
        const generator = await createMockDataGenerator({ resourceRoot });
        try {
            const result = await generator.generateService(request, {
                mode: 'deterministic',
                seed: 7,
                rowsPerEntity: 3
            });
            const reference = await createMockDataGenerator();
            const expected = await reference
                .generateService(request, { mode: 'deterministic', seed: 7, rowsPerEntity: 3 })
                .finally(() => reference.dispose());
            // Then it generates the same rows as the package's own resources, under the same model revision
            expect(result.resources).toEqual(expected.resources);
            expect(result.modelRevision).toBe(getMockDataGeneratorInfo().model.revision);
            expect(getMockDataGeneratorInfo({ resourceRoot })).toEqual(getMockDataGeneratorInfo());
        } finally {
            await generator.dispose();
        }
    });

    it('rejects a data resource that differs from the manifest', async () => {
        // Given a corrupted copy of the value-bank store
        await writeFile(join(resourceRoot, 'banks/value-banks.v2.json'), '{}');
        // When a session is created on that root, Then the integrity failure names the dataset
        await expect(createMockDataGenerator({ resourceRoot })).rejects.toMatchObject({
            code: 'RESOURCE_INTEGRITY',
            message: expect.stringContaining('mockgen-value-banks')
        });
    });

    it('rejects a resource root without a manifest', async () => {
        // Given a root without its model manifest
        await rm(join(resourceRoot, 'models'), { recursive: true });
        // When a session or the package information is requested, Then the manifest is reported unreadable
        await expect(createMockDataGenerator({ resourceRoot })).rejects.toMatchObject({ code: 'RESOURCE_INTEGRITY' });
        expect(() => getMockDataGeneratorInfo({ resourceRoot })).toThrow(
            expect.objectContaining({ code: 'RESOURCE_INTEGRITY' })
        );
    });

    it('reports model artifacts missing from the resource root when a learned run needs them', async () => {
        // Given a root with the manifest and data resources but without the model artifacts
        const generator = await createMockDataGenerator({ resourceRoot });
        try {
            // When a learned run starts, Then the missing artifacts are reported before any model loads
            await expect(generator.generateService(request, { mode: 'auto', seed: 1 })).rejects.toMatchObject({
                code: 'RESOURCE_INTEGRITY',
                message: expect.stringContaining('missing or corrupt model artifacts')
            });
        } finally {
            await generator.dispose();
        }
    });

    it.each(['relative/resources', '', 42])('rejects the resource root %p', async (value) => {
        // Given a resource root that is not an absolute path
        const options = { resourceRoot: value as string };
        // When a session or the package information is requested, Then the option is rejected
        await expect(createMockDataGenerator(options)).rejects.toMatchObject({ code: 'CONFIGURATION_INVALID' });
        expect(() => getMockDataGeneratorInfo(options)).toThrow(
            expect.objectContaining({ code: 'CONFIGURATION_INVALID' })
        );
    });
});
