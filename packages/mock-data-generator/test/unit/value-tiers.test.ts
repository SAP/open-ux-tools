import { jest } from '@jest/globals';
import { readFileSync } from 'node:fs';

import { generateServiceForTesting } from '../../src/index.js';
import type { MockDataGeneratorResult, SftGenerator } from '../../src/types.js';

const travel = readFileSync(new URL('./travel-v2.metadata.xml', import.meta.url), 'utf8');
const targets = [...travel.matchAll(/<EntitySet\s+Name="([^"]+)"/gu)].map((match) => ({
    name: match[1],
    kind: 'entity-set' as const
}));
const request = {
    metadata: { format: 'edmx', content: travel },
    service: { urlPath: '/travel', odataVersion: '2.0' },
    targets,
    existingData: {}
} as const;

/** Slots the caller can see in the published dataset. */
function publishedSlots(result: MockDataGeneratorResult): number {
    return Object.values(result.resources).reduce(
        (total, rows) => total + rows.reduce((count, row) => count + Object.keys(row).length, 0),
        0
    );
}

describe('value tier accounting', () => {
    it('attributes every published cell to exactly one tier', async () => {
        const finance = readFileSync(new URL('./synthetic-finance.metadata.xml', import.meta.url), 'utf8');
        const result = await generateServiceForTesting(
            {
                metadata: { format: 'edmx', content: finance },
                service: { urlPath: '/finance', odataVersion: '4.0' },
                targets: [...finance.matchAll(/<EntitySet\s+Name="([^"]+)"/gu)].map((match) => ({
                    name: match[1],
                    kind: 'entity-set' as const
                })),
                existingData: {}
            },
            { mode: 'deterministic', seed: 123, rowsPerEntity: 3 }
        );

        expect(result.tiers).toBeDefined();
        const tiers = result.tiers!;
        const sum = tiers.authored + tiers.declared + tiers.recognised + tiers.model + tiers.typed + tiers.structural;
        expect(sum).toBe(tiers.slots);
        expect(tiers.slots).toBe(publishedSlots(result));
        // No language model ran, so nothing is attributed to it.
        expect(tiers.model).toBe(0);
        expect(tiers.recognised).toBeGreaterThan(0);
        expect(tiers.structural).toBeGreaterThan(0);
    });

    it('counts non-key booleans as declared, since their type enumerates both values', async () => {
        const flags = `<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0"><edmx:DataServices><Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="Demo">
<EntityType Name="Order"><Key><PropertyRef Name="ID"/><PropertyRef Name="IsActiveEntity"/></Key>
<Property Name="ID" Type="Edm.Int32" Nullable="false"/>
<Property Name="IsActiveEntity" Type="Edm.Boolean" Nullable="false"/>
<Property Name="Flag1" Type="Edm.Boolean"/>
<Property Name="Flag2" Type="Edm.Boolean"/>
</EntityType>
<EntityContainer Name="Container"><EntitySet Name="Orders" EntityType="Demo.Order"/></EntityContainer>
</Schema></edmx:DataServices></edmx:Edmx>`;
        const result = await generateServiceForTesting(
            {
                metadata: { format: 'edmx', content: flags },
                service: { urlPath: '/flags', odataVersion: '4.0' },
                targets: [{ name: 'Orders', kind: 'entity-set' }],
                existingData: {}
            },
            { mode: 'deterministic', seed: 7, rowsPerEntity: 4 }
        );
        const rows = result.resources.Orders;
        expect(rows.every((row) => typeof row.Flag1 === 'boolean' && typeof row.Flag2 === 'boolean')).toBe(true);
        expect(result.tiers?.declared).toBe(rows.length * 2);
        // The boolean key stays a key on the typed floor; no boolean cell is left as addressable, and the
        // `booleans` cause that API version 2 hosts validate is present and zero.
        expect(result.typedFloor).toMatchObject({ keys: rows.length * 2, booleans: 0, addressable: 0 });
    });

    it('attributes accepted model values to the fine-tuned tier and nothing else', async () => {
        const generate = jest.fn<SftGenerator['generate']>(async (input) => ({
            rows: Array.from({ length: 3 }, () =>
                Object.fromEntries(
                    input.fields.map(({ name, primitiveType }) => [
                        name,
                        primitiveType === 'string' ? 'Model written value' : 7
                    ])
                )
            )
        }));
        const result = await generateServiceForTesting(
            request,
            { mode: 'auto', seed: 123, rowsPerEntity: 3 },
            {
                sft: { fingerprint: 'tier-accounting', generate },
                candidateVerifier: {
                    fingerprint: 'accepts-everything',
                    verifyBatch: async (pairs) => pairs.map(() => true)
                }
            }
        );

        const tiers = result.tiers!;
        expect(tiers.model).toBe(result.statistics.sft.acceptedSlots);
        expect(tiers.model).toBeGreaterThan(0);
        // The editor rejects a result whose typed-floor causes do not add up to the typed tier, so
        // cells the model overwrote must leave the floor's causes exactly as they leave the tier.
        const floor = result.typedFloor!;
        expect(floor.keys + floor.protocol + floor.addressable).toBe(tiers.typed);
        const sum = tiers.authored + tiers.declared + tiers.recognised + tiers.model + tiers.typed + tiers.structural;
        expect(sum).toBe(tiers.slots);
        expect(tiers.slots).toBe(publishedSlots(result));
    });
});
