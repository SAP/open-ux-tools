import { generateService } from '../../src/index.js';
import { matchConcept, parseConceptHead } from '../../src/model/concept-head.js';
import { parseEdmx } from '../../src/schema/edmx.js';
import { arbitrateSemanticClassifications } from '../../src/semantics/lexical-fallback.js';
import type { ConceptBank, SemanticClassification, SftGenerator } from '../../src/types.js';

const contract = {
    dim: 3,
    encoderSha256: 'a'.repeat(64),
    tokenizerSha256: 'b'.repeat(64),
    serializerFingerprint: 'serializer-v3'
};

function headDocument(prototypes: number[][], concepts: object[], thresholds = { similarity: 0.8, margin: 0.05 }) {
    const buffer = Buffer.alloc(prototypes.length * 3 * 4);
    prototypes.flat().forEach((value, index) => buffer.writeFloatLE(value, index * 4));
    return {
        format: 'mockgen-concept-head',
        version: 1,
        ...contract,
        thresholds,
        concepts,
        prototypes: buffer.toString('base64')
    };
}

const purchasingGroup = {
    id: 'purchasing-group',
    name: 'purchasing group',
    valueKind: 'code-text',
    types: ['string'],
    pairs: [
        { code: '001', text: 'Office Supplies' },
        { code: '002', text: 'Raw Materials' },
        { code: '003', text: 'IT Hardware' }
    ]
};
const controllingArea = {
    id: 'controlling-area',
    name: 'controlling area',
    valueKind: 'code',
    types: ['string'],
    values: ['1000', '2000', 'A000']
};
const headcount = {
    id: 'headcount',
    name: 'headcount',
    valueKind: 'number',
    types: ['int'],
    range: { min: 1, max: 500, scale: 0 }
};

describe('concept prototype head (head B)', () => {
    it('validates the head against the classifier encoder contract', () => {
        const document = headDocument(
            [
                [1, 0, 0],
                [0, 1, 0]
            ],
            [purchasingGroup, controllingArea]
        );
        expect(parseConceptHead(document, contract).concepts.map((concept) => concept.id)).toEqual([
            'purchasing-group',
            'controlling-area'
        ]);
        expect(() => parseConceptHead(document, { ...contract, encoderSha256: 'c'.repeat(64) })).toThrow(
            /encoderSha256/u
        );
        expect(() => parseConceptHead({ ...document, prototypes: 'AAAA' }, contract)).toThrow(/prototypes/u);
        expect(() =>
            parseConceptHead(headDocument([[1, 0, 0]], [{ ...controllingArea, values: [] }]), contract)
        ).toThrow(/values/u);
    });

    it('matches the nearest type-compatible concept only when it clears both thresholds', () => {
        const head = parseConceptHead(
            headDocument(
                [
                    [1, 0, 0],
                    [0, 1, 0],
                    [0, 0, 1]
                ],
                [purchasingGroup, controllingArea, headcount]
            ),
            contract
        );
        expect(matchConcept(head, [0.99, 0.05, 0], 'string')).toMatchObject({ id: 'purchasing-group' });
        // Close to two concepts: the runner-up gap is too small.
        expect(matchConcept(head, [0.7, 0.69, 0], 'string')).toBeUndefined();
        // Far from every concept.
        expect(matchConcept(head, [0.5, 0.5, 0.7], 'string')).toBeUndefined();
        // A numeric concept never takes a text column, a text concept never takes a numeric column.
        expect(matchConcept(head, [0, 0, 1], 'string')).toBeUndefined();
        expect(matchConcept(head, [0, 0, 1], 'int')).toMatchObject({ id: 'headcount' });
        expect(matchConcept(head, [1, 0, 0], 'int')).toBeUndefined();
    });

    it('applies the minimum similarity of each concept on top of the global one', () => {
        const head = parseConceptHead(
            headDocument(
                [
                    [1, 0, 0],
                    [0, 1, 0]
                ],
                [{ ...purchasingGroup, minimumSimilarity: 0.97 }, controllingArea]
            ),
            contract
        );
        expect(matchConcept(head, [0.9, 0.1, 0.4], 'string')).toBeUndefined();
        expect(matchConcept(head, [0.99, 0.01, 0], 'string')).toMatchObject({ id: 'purchasing-group' });
        expect(() =>
            parseConceptHead(headDocument([[1, 0, 0]], [{ ...controllingArea, minimumSimilarity: 1.5 }]), contract)
        ).toThrow(/minimum similarity/u);
    });

    it('lets a learned acceptance layer decide whether the nearest concept is taken', () => {
        const kinds = ['code', 'code-text', 'identifier', 'name', 'text', 'number', 'decimal'];
        const features = [
            'similarity',
            'margin',
            'similarityOverP25',
            'similarityOverP50',
            'similarityOverP10',
            'examples',
            ...kinds.map((kind) => `kind:${kind}`)
        ];
        // Only similarity matters: probability 0.5 at similarity 0.9.
        const acceptance = {
            model: 'logistic-v1',
            features,
            mean: features.map((_, index) => (index === 0 ? 0.9 : 0)),
            scale: features.map(() => 1),
            weights: features.map((_, index) => (index === 0 ? 50 : 0)),
            bias: 0,
            threshold: 0.5
        };
        const cohesion = { p10: 0.8, p25: 0.85, p50: 0.9, examples: 20 };
        const document = {
            ...headDocument(
                [
                    [1, 0, 0],
                    [0, 1, 0]
                ],
                [
                    { ...purchasingGroup, cohesion },
                    { ...controllingArea, cohesion }
                ],
                { similarity: 0.5, margin: 0 }
            ),
            acceptance
        };
        const head = parseConceptHead(document, contract);
        expect(matchConcept(head, [0.95, 0.05, 0.3], 'string')).toMatchObject({ id: 'purchasing-group' });
        expect(matchConcept(head, [0.8, 0.05, 0.6], 'string')).toBeUndefined();
        expect(() =>
            parseConceptHead({ ...document, acceptance: { ...acceptance, features: ['similarity'] } }, contract)
        ).toThrow(/features/u);
    });

    const metadata = `<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0"><edmx:DataServices><Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="Demo">
<EntityType Name="PurchaseOrder"><Key><PropertyRef Name="PurchaseOrderID"/></Key>
<Property Name="PurchaseOrderID" Type="Edm.String" MaxLength="10" Nullable="false"/>
<Property Name="PurchasingGroup" Type="Edm.String" MaxLength="3"><Annotation Term="Common.Text" Path="PurchasingGroupText"/></Property>
<Property Name="PurchasingGroupText" Type="Edm.String" MaxLength="40"/>
<Property Name="ControllingArea" Type="Edm.String" MaxLength="4"/>
<Property Name="IsActiveEntity" Type="Edm.Boolean"/>
</EntityType>
<EntityContainer Name="Container"><EntitySet Name="PurchaseOrders" EntityType="Demo.PurchaseOrder"/></EntityContainer>
</Schema></edmx:DataServices></edmx:Edmx>`;

    const matches: Record<string, SemanticClassification['concept']> = {
        PurchaseOrderID: { id: 'controlling-area', similarity: 0.95, margin: 0.3 },
        PurchasingGroup: { id: 'purchasing-group', similarity: 0.93, margin: 0.2 },
        PurchasingGroupText: { id: 'purchasing-group', similarity: 0.9, margin: 0.2 },
        ControllingArea: { id: 'controlling-area', similarity: 0.91, margin: 0.25 }
    };

    it('lets a concept decide only value columns that no role accepted', () => {
        const graph = parseEdmx(metadata);
        const learned = new Map<string, SemanticClassification>(
            Object.entries(matches).map(([name, concept]) => [
                `PurchaseOrders.${name}`,
                { role: 'unknown', confidence: 0.2, source: 'classifier', concept }
            ])
        );
        const decisions = arbitrateSemanticClassifications(graph, learned);
        expect(decisions.get('PurchaseOrders.PurchasingGroup')).toMatchObject({
            source: 'concept',
            concept: { id: 'purchasing-group' }
        });
        expect(decisions.get('PurchaseOrders.ControllingArea')).toMatchObject({
            source: 'concept',
            concept: { id: 'controlling-area' }
        });
        // Keys never take a concept.
        expect(decisions.get('PurchaseOrders.PurchaseOrderID')?.source).not.toBe('concept');
    });

    it('fills concept columns from their bank, keeping a code and its text on the same pair', async () => {
        const banks = new Map<string, ConceptBank>(
            [purchasingGroup, controllingArea].map((bank) => [bank.id, bank as ConceptBank])
        );
        const generate = jest.fn<SftGenerator['generate']>(async () => ({ rows: [] }));
        const result = await generateService(
            {
                metadata: { format: 'edmx', content: metadata },
                service: { urlPath: '/orders', odataVersion: '4.0' },
                targets: [{ name: 'PurchaseOrders', kind: 'entity-set' }],
                existingData: {}
            },
            { pipeline: 'semantic-v2', seed: 4, rowsPerEntity: 6 },
            {
                classifier: {
                    fingerprint: 'concept-test',
                    inputFormat: 'v3',
                    classify: async (input) => ({
                        role: 'unknown',
                        confidence: 0.2,
                        source: 'classifier',
                        ...(matches[input.propertyName] ? { concept: matches[input.propertyName] } : {})
                    }),
                    conceptBank: (id) => banks.get(id)
                },
                sft: { fingerprint: 'concept-sft', generate }
            }
        );
        const pairs = new Map(purchasingGroup.pairs.map((pair) => [pair.code, pair.text]));
        for (const row of result.resources.PurchaseOrders) {
            expect(pairs.get(String(row.PurchasingGroup))).toBe(row.PurchasingGroupText);
            expect(controllingArea.values).toContain(row.ControllingArea);
        }
        expect(result.routing?.conceptAccepted).toBe(3);
        expect(generate.mock.calls.flatMap(([input]) => input.fields.map((field) => field.name))).not.toEqual(
            expect.arrayContaining(['PurchasingGroup', 'PurchasingGroupText', 'ControllingArea'])
        );
    });
});
