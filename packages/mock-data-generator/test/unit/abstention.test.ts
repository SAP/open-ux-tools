import { jest } from '@jest/globals';

import { generateServiceForTesting } from '../../src/index.js';
import type { MockDataServiceRequest, SftGenerator } from '../../src/types.js';

/**
 * A one-entity OData V4 service.
 *
 * @param entitySet entity set name
 * @param properties property elements of the entity type, after its `ID` key
 * @returns the generation request
 */
function service(entitySet: string, properties: string): MockDataServiceRequest {
    return {
        metadata: {
            format: 'edmx',
            content: `<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0"><edmx:DataServices><Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="Demo">
<EntityType Name="${entitySet}Type"><Key><PropertyRef Name="ID"/></Key>
<Property Name="ID" Type="Edm.Int32" Nullable="false"/>
${properties}
</EntityType>
<EntityContainer Name="Container"><EntitySet Name="${entitySet}" EntityType="Demo.${entitySet}Type"/></EntityContainer>
</Schema></edmx:DataServices></edmx:Edmx>`
        },
        service: { urlPath: `/${entitySet}`, odataVersion: '4.0' },
        targets: [{ name: entitySet, kind: 'entity-set' }],
        existingData: {}
    };
}

describe('abstention instead of placeholders', () => {
    it('fills a string without a meaningful generator with the standard mock server value, never a label', async () => {
        // Given string fields no role, enumeration or model can fill: nullable, mandatory, and a short column
        const request = service(
            'Widgets',
            `<Property Name="Zorblat" Type="Edm.String" MaxLength="40"/>
<Property Name="Quixel" Type="Edm.String" MaxLength="40" Nullable="false"/>
<Property Name="QuixelCode" Type="Edm.String" MaxLength="3"/>`
        );

        // When the service is generated without a model
        const result = await generateServiceForTesting(request, { mode: 'deterministic', seed: 3, rowsPerEntity: 4 });

        // Then, as the last resort, each field holds the property name and the row index the way the standard
        // mock server writes it, cut to the column, and no field holds a label or the entity name
        const rows = result.resources.Widgets;
        expect(rows.map((row) => row.Zorblat)).toEqual(['Zorblat_0', 'Zorblat_1', 'Zorblat_2', 'Zorblat_3']);
        expect(rows.map((row) => row.Quixel)).toEqual(['Quixel_0', 'Quixel_1', 'Quixel_2', 'Quixel_3']);
        expect(rows.map((row) => row.QuixelCode)).toEqual(['Q_0', 'Q_1', 'Q_2', 'Q_3']);
        expect(JSON.stringify(rows.map((row) => Object.values(row)))).not.toMatch(/Widget/u);
        // And the abstentions and the fallback cells are counted, while the typed-floor causes still add up to
        // the typed tier
        expect(result.abstentions).toEqual({ typedFloor: 12, realismGuard: 0, standardFallback: 12 });
        const floor = result.typedFloor;
        expect(floor && floor.keys + floor.booleans + floor.protocol + floor.addressable).toBe(result.tiers?.typed);
    });
});

describe('realism guard', () => {
    it('withholds a model value that is the name of another field', async () => {
        // Given a model that writes a sibling field's technical name into a type field
        const request = service(
            'Mappings',
            `<Property Name="TransactionType" Type="Edm.String" MaxLength="40"/>
<Property Name="LastChangedByUser" Type="Edm.String" MaxLength="40"/>`
        );
        const generate = jest.fn<SftGenerator['generate']>(async (input) => ({
            rows: Array.from({ length: 3 }, () =>
                Object.fromEntries(
                    input.fields.map(({ name, primitiveType }) => [
                        name,
                        primitiveType === 'string' ? 'LastChangedByUser' : 7
                    ])
                )
            )
        }));

        // When the service is generated with the model
        const result = await generateServiceForTesting(
            request,
            { mode: 'auto', seed: 5, rowsPerEntity: 3 },
            {
                sft: { fingerprint: 'leaking-model', generate },
                candidateVerifier: {
                    fingerprint: 'accepts-everything',
                    verifyBatch: async (pairs) => pairs.map(() => true)
                }
            }
        );

        // Then no published value is a field name, and the withheld cells are reported per field
        const rows = result.resources.Mappings;
        expect(rows.some((row) => row.TransactionType === 'LastChangedByUser')).toBe(false);
        expect(result.diagnostics).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ code: 'REALISM_VALUE_WITHHELD', target: 'Mappings.TransactionType' })
            ])
        );
        expect(result.abstentions?.realismGuard).toBeGreaterThan(0);
    });

    it('keeps numbered model values that echo no name of the service, and withholds counted service names', async () => {
        // Given a model that numbers a word the service does not use, and counts up a field's own label
        const request = service(
            'Rooms',
            `<Property Name="Location" Type="Edm.String" MaxLength="40"/>
<Property Name="Note" Type="Edm.String" MaxLength="40"><Annotation Term="Common.Label" String="Remark"/></Property>`
        );
        const generate = jest.fn<SftGenerator['generate']>(async () => ({
            rows: [1, 2, 3].map((number) => ({ Location: `Floor ${number}`, Note: `Remark ${number}` }))
        }));

        // When the service is generated with the model
        const result = await generateServiceForTesting(
            request,
            { mode: 'auto', seed: 5, rowsPerEntity: 3 },
            {
                sft: { fingerprint: 'numbering-model', generate },
                candidateVerifier: {
                    fingerprint: 'accepts-everything',
                    verifyBatch: async (pairs) => pairs.map(() => true)
                }
            }
        );

        // Then the floors stay, and the counted-up label is withheld
        const rows = result.resources.Rooms;
        expect(rows.map((row) => row.Location)).toEqual(['Floor 1', 'Floor 2', 'Floor 3']);
        expect(rows.some((row) => String(row.Note).startsWith('Remark'))).toBe(false);
    });

    it('withholds codes that fill a field named as a text, and keeps a text column with the odd code', async () => {
        // Given a model that writes codes into one name field and words with one code into another
        const request = service(
            'Tiers',
            `<Property Name="TierName" Type="Edm.String" MaxLength="40"/>
<Property Name="TierDescription" Type="Edm.String" MaxLength="40"/>`
        );
        const generate = jest.fn<SftGenerator['generate']>(async () => ({
            rows: [
                { TierName: 'Q', TierDescription: 'Entry level' },
                { TierName: '30', TierDescription: 'B2' },
                { TierName: '14', TierDescription: 'Top level' }
            ]
        }));

        // When the service is generated with the model
        const result = await generateServiceForTesting(
            request,
            { mode: 'auto', seed: 5, rowsPerEntity: 3 },
            {
                sft: { fingerprint: 'coding-model', generate },
                candidateVerifier: {
                    fingerprint: 'accepts-everything',
                    verifyBatch: async (pairs) => pairs.map(() => true)
                }
            }
        );

        // Then the codes of the code-filled name are withheld and the standard fallback takes their place, and
        // the mostly worded description stays
        const rows = result.resources.Tiers;
        expect(rows.map((row) => row.TierName)).toEqual(['TierName_0', 'TierName_1', 'TierName_2']);
        expect(rows.map((row) => row.TierDescription)).toEqual(['Entry level', 'B2', 'Top level']);
        expect(result.diagnostics).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ code: 'REALISM_VALUE_WITHHELD', target: 'Tiers.TierName' })
            ])
        );
    });

    it('keeps the values of supplied rows even when they look like placeholders', async () => {
        // Given supplied rows whose text names another field and counts up a prefix
        const base = service(
            'Mappings',
            `<Property Name="TransactionType" Type="Edm.String" MaxLength="40"/>
<Property Name="LastChangedByUser" Type="Edm.String" MaxLength="40"/>`
        );
        const rows = [1, 2, 3].map((ID) => ({
            ID,
            TransactionType: `Run Type ${ID}`,
            LastChangedByUser: 'LastChangedByUser'
        }));
        const request: MockDataServiceRequest = {
            ...base,
            existingData: {
                Mappings: { contributor: { present: false }, initialRows: { source: 'json', present: true, rows } }
            }
        };

        // When the service is generated
        const result = await generateServiceForTesting(request, { mode: 'deterministic', seed: 5, rowsPerEntity: 3 });

        // Then the supplied values are published as written and nothing is reported as withheld
        expect(result.resources.Mappings).toEqual(rows);
        expect(result.diagnostics.map(({ code }) => code)).not.toContain('REALISM_VALUE_WITHHELD');
        expect(result.abstentions?.realismGuard).toBe(0);
    });
});
