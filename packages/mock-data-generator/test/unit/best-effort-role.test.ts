import { compileSemanticPlan } from '../../src/generation/semantic-plan.js';
import type { SchemaEntity, SchemaGraph, SchemaProperty } from '../../src/schema/graph.js';
import type { MockDataGeneratorDiagnostic, SemanticClassification } from '../../src/types.js';

const property = (name: string, options: Partial<SchemaProperty> = {}): SchemaProperty => ({
    name,
    primitiveType: 'string',
    nullable: true,
    isKey: false,
    annotations: [],
    ...options
});

/** Carriers keyed by a code, with a name and a short internal code. */
const carriers: SchemaEntity = {
    name: 'Carrier',
    entitySetName: 'Carriers',
    properties: [
        property('CarrierID', { isKey: true, nullable: false, maxLength: 3 }),
        property('CarrierName', { maxLength: 40 }),
        property('Remark', { maxLength: 40 })
    ]
};
const graph: SchemaGraph = { namespace: 'Demo', entities: [carriers], relationships: [] };

/**
 * An arbitrated abstention that keeps the classifier's ranked candidates.
 *
 * @param reason why the field abstained
 * @param top the classifier's ranked candidates
 * @returns the decision
 */
const abstained = (
    reason: NonNullable<SemanticClassification['abstentionReason']>,
    top: SemanticClassification['top']
): SemanticClassification => ({
    role: 'unknown',
    confidence: top?.[0]?.confidence ?? 0,
    source: 'unknown',
    routeThreshold: 0.86,
    top,
    abstentionReason: reason
});

describe('best-effort roles', () => {
    it('gives a field the classifier was not certain about its best-ranked role that fits', () => {
        // Given a carrier name the classifier ranks as an organisation name below its route threshold
        const diagnostics: MockDataGeneratorDiagnostic[] = [];
        const detected = new Map([
            [
                'Carriers.CarrierName',
                abstained('below-threshold', [
                    { role: 'org_name', confidence: 0.51 },
                    { role: 'description', confidence: 0.27 },
                    { role: 'unknown', confidence: 0.11 }
                ])
            ]
        ]);

        // When the plan is compiled
        const plan = compileSemanticPlan(graph, detected, diagnostics);

        // Then the field takes the organisation name as a best effort, which the model may still replace, and
        // the choice is reported
        expect(plan.get('Carriers.CarrierName')).toMatchObject({ role: 'org_name', bestEffort: true });
        expect(diagnostics).toContainEqual(
            expect.objectContaining({ code: 'SEMANTIC_ROLE_BEST_EFFORT', target: 'Carriers.CarrierName' })
        );
    });

    it('ignores a role the classifier ranks below no role at all', () => {
        // Given a remark the classifier most likely calls unknown
        const detected = new Map([
            [
                'Carriers.Remark',
                abstained('below-threshold', [
                    { role: 'unknown', confidence: 0.6 },
                    { role: 'org_name', confidence: 0.3 }
                ])
            ]
        ]);

        // When the plan is compiled
        const plan = compileSemanticPlan(graph, detected, []);

        // Then the remark keeps no role
        expect(plan.get('Carriers.Remark')).toMatchObject({ role: 'unknown' });
    });

    it('skips a role another field of the entity already holds', () => {
        // Given a remark ranked as an organisation name next to a carrier name that holds that role
        const detected = new Map<string, SemanticClassification>([
            [
                'Carriers.CarrierName',
                {
                    role: 'org_name',
                    confidence: 0.99,
                    source: 'classifier',
                    routeThreshold: 0.5,
                    top: [{ role: 'org_name', confidence: 0.99 }]
                }
            ],
            ['Carriers.Remark', abstained('below-threshold', [{ role: 'org_name', confidence: 0.5 }])]
        ]);

        // When the plan is compiled
        const plan = compileSemanticPlan(graph, detected, []);

        // Then the remark keeps no role, so a row does not show the carrier's name twice
        expect(plan.get('Carriers.CarrierName')).toMatchObject({ role: 'org_name' });
        expect(plan.get('Carriers.Remark')).toMatchObject({ role: 'unknown' });
    });

    it('keeps the decision of a field that abstained for its key', () => {
        // Given a key the key policy kept from a role
        const detected = new Map([
            ['Carriers.CarrierID', abstained('key-policy', [{ role: 'org_name', confidence: 0.9 }])]
        ]);

        // When the plan is compiled
        const plan = compileSemanticPlan(graph, detected, []);

        // Then the key takes no best-effort role
        expect(plan.get('Carriers.CarrierID')).toMatchObject({ role: 'unknown', abstentionReason: 'key-policy' });
    });
});
