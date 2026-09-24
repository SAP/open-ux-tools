import { generateService } from '../../src/index.js';
import type { SftCandidateRelevanceVerifier, SftGenerator } from '../../src/types.js';

// A code with its caption (both proposed by the model), a free text and an amount.
const metadata = `<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0"><edmx:DataServices><Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="Demo">
<EntityType Name="Ticket"><Key><PropertyRef Name="ID"/></Key>
<Property Name="ID" Type="Edm.Int32" Nullable="false"/>
<Property Name="Category" Type="Edm.String" MaxLength="10"><Annotation Term="Common.Text" Path="CategoryText"/></Property>
<Property Name="CategoryText" Type="Edm.String" MaxLength="40"/>
<Property Name="Remark" Type="Edm.String" MaxLength="60"/>
<Property Name="Effort" Type="Edm.Decimal" Precision="5" Scale="1"/>
</EntityType>
<EntityContainer Name="Container"><EntitySet Name="Tickets" EntityType="Demo.Ticket"/></EntityContainer>
</Schema></edmx:DataServices></edmx:Edmx>`;
const request = {
    metadata: { format: 'edmx', content: metadata },
    service: { urlPath: '/tickets', odataVersion: '4.0' },
    targets: [{ name: 'Tickets', kind: 'entity-set' }],
    existingData: {}
} as const;
const options = { pipeline: 'semantic-v2', seed: 5, rowsPerEntity: 3 } as const;

/**
 * A model double answering with fixed rows, recording the coupled groups it was sent.
 *
 * @param rows candidate rows
 * @param groups receives each call's coupled field groups
 * @returns the generator double
 */
function answering(rows: ReadonlyArray<Record<string, unknown>>, groups: unknown[] = []): SftGenerator {
    return {
        fingerprint: 'field-acceptance',
        generate: async (input) => {
            groups.push(input.coupledFieldGroups);
            return { rows: rows as never };
        }
    };
}

/**
 * A relevance check that accepts the listed captions only.
 *
 * @param accepted captions to accept
 * @returns the verifier double
 */
function verifying(accepted: ReadonlyArray<string>): SftCandidateRelevanceVerifier {
    return {
        fingerprint: 'accepts-listed-captions',
        verifyBatch: async (pairs) => pairs.map(({ value }) => accepted.includes(value))
    };
}

describe('per-field acceptance of fine-tuned values', () => {
    it('sends a code with its caption as one coupled group and accepts them only together', async () => {
        const groups: unknown[] = [];
        const result = await generateService(request, options, {
            sft: answering(
                [
                    { Category: 'HW', CategoryText: 'Hardware fault', Remark: 'Replaced the fan', Effort: 2.5 },
                    // The caption repeats its code, so the pair is rejected; the other fields stand.
                    { Category: 'SW', CategoryText: 'SW', Remark: 'Patched the client', Effort: 1.5 },
                    // The amount breaks its scale; only the amount keeps its fallback.
                    { Category: 'NW', CategoryText: 'Network outage', Remark: 'Reset the switch', Effort: 1.25 }
                ],
                groups
            ),
            candidateVerifier: verifying(['Hardware fault', 'Network outage'])
        });

        expect(groups[0]).toEqual([['Category', 'CategoryText']]);
        const rows = result.resources.Tickets;
        expect(rows[0]).toMatchObject({ Category: 'HW', CategoryText: 'Hardware fault', Effort: 2.5 });
        expect(rows[1]).toMatchObject({ Remark: 'Patched the client', Effort: 1.5 });
        expect(rows[1]?.Category).not.toBe('SW');
        expect(rows[2]).toMatchObject({ Category: 'NW', CategoryText: 'Network outage', Remark: 'Reset the switch' });
        expect(rows[2]?.Effort).not.toBe(1.25);
        const effort = result.statistics.sft.assignments[0]?.fields.find(({ name }) => name === 'Effort');
        expect(effort).toMatchObject({ acceptedSlots: 2, invalidSlots: 1 });
    });

    it('keeps the fallback caption of rows the relevance check declines and accepts the verified rows', async () => {
        const result = await generateService(request, options, {
            sft: answering([
                { Category: 'HW', CategoryText: 'Hardware fault', Remark: 'Replaced the fan', Effort: 2.5 },
                { Category: 'SW', CategoryText: 'Software fault', Remark: 'Patched the client', Effort: 1.5 },
                { Category: 'NW', CategoryText: 'Network outage', Remark: 'Reset the switch', Effort: 3.5 }
            ]),
            candidateVerifier: verifying(['Hardware fault'])
        });

        const rows = result.resources.Tickets;
        expect(rows[0]).toMatchObject({ Category: 'HW', CategoryText: 'Hardware fault' });
        expect(rows[1]?.CategoryText).not.toBe('Software fault');
        expect(rows[1]).toMatchObject({ Remark: 'Patched the client', Effort: 1.5 });
        expect(rows[2]?.CategoryText).not.toBe('Network outage');
    });
});
