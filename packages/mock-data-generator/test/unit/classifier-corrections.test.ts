import { LEGACY_HEAD_LABEL_ALIASES } from '../../src/model/embedding-classifier.js';
import {
    createEmbeddingSemanticClassifier,
    serializeFieldContextV3,
    FIELD_CONTEXT_SERIALIZER_FINGERPRINT
} from '../../src/index.js';
import type { EmbeddingClassifierHead, FieldContextV3 } from '../../src/index.js';
import type { SchemaGraph, SchemaProperty } from '../../src/schema/graph.js';
import { SEMANTIC_ROLE_REGISTRY, SEMANTIC_ROLE_REGISTRY_FINGERPRINT } from '../../src/semantics/role-registry.js';
import { arbitrateSemanticClassifications } from '../../src/semantics/lexical-fallback.js';
import { parseEdmx } from '../../src/schema/edmx.js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { compileSemanticPlan } from '../../src/generation/semantic-plan.js';

const context: FieldContextV3 = {
    inputFormat: 'v3',
    entityName: 'Contact',
    propertyName: 'Email',
    primitiveType: 'string',
    annotations: [],
    nullable: false,
    isKey: false,
    facets: {},
    linkedMetadataPaths: [],
    relationshipParticipation: [],
    neighbors: []
};
const head: EmbeddingClassifierHead = {
    model: 'test',
    dim: 1,
    labels: ['unknown', 'email'],
    coef: [[0], [0]],
    intercept: [10, 0],
    inputFormat: 'v3',
    maxWordPieceTokens: 64,
    encoderSha256: 'a'.repeat(64),
    registryFingerprint: SEMANTIC_ROLE_REGISTRY_FINGERPRINT,
    abstentionLabels: ['unknown'],
    roleCalibration: { email: 0.98 },
    familyCalibration: { contact: 0.99 },
    calibration: {
        temperature: 1,
        routeConfidenceThreshold: 0.4,
        annotationOverrideThreshold: 0.99,
        conformalQuantile: 0.9,
        coverage: 0.9,
        ece: { before: 0, after: 0 },
        source: 'test'
    }
};
function classifier(intercept = head.intercept, overrides: Partial<EmbeddingClassifierHead> = {}) {
    return createEmbeddingSemanticClassifier({
        fingerprint: 'test',
        head: {
            ...head,
            intercept,
            ...overrides,
            tokenizerSha256: 'b'.repeat(64),
            serializerFingerprint: FIELD_CONTEXT_SERIALIZER_FINGERPRINT
        },
        embedder: { embed: async () => [[0]] },
        serializeV3Input: serializeFieldContextV3,
        v3SerializerFingerprint: FIELD_CONTEXT_SERIALIZER_FINGERPRINT,
        v3Roles: SEMANTIC_ROLE_REGISTRY,
        v3RegistryFingerprint: SEMANTIC_ROLE_REGISTRY_FINGERPRINT
    });
}

function directGraph(
    properties: ReadonlyArray<SchemaProperty>,
    entityName = 'Travel',
    codeList?: 'currency' | 'unit'
): SchemaGraph {
    return {
        namespace: 'Test',
        entities: [
            { name: entityName, entitySetName: `${entityName}s`, ...(codeList ? { codeList } : {}), properties }
        ],
        relationships: []
    };
}

function property(
    name: string,
    primitiveType: SchemaProperty['primitiveType'],
    overrides: Partial<SchemaProperty> = {}
) {
    return {
        name,
        primitiveType,
        nullable: false,
        isKey: false,
        annotations: [],
        ...overrides
    } satisfies SchemaProperty;
}

function unknownClassification(): {
    role: 'unknown';
    confidence: number;
    source: 'classifier';
    routeThreshold: number;
    predictionSetSize: number;
    top: ReadonlyArray<{ role: string; confidence: number }>;
} {
    return {
        role: 'unknown',
        confidence: 0.9999,
        source: 'classifier',
        routeThreshold: 0.4,
        predictionSetSize: 2,
        top: [
            { role: 'unknown', confidence: 0.9999 },
            { role: 'email', confidence: 0.000045 }
        ]
    };
}

describe('semantic classifier correction regressions', () => {
    it('has an explicit routing contract for every packaged classifier label', () => {
        const artifact: unknown = JSON.parse(
            readFileSync(join(process.cwd(), 'resources/models/classifier/head.json'), 'utf8')
        );
        if (!artifact || typeof artifact !== 'object' || !('labels' in artifact) || !Array.isArray(artifact.labels)) {
            throw new TypeError('The packaged classifier has no labels');
        }
        const missing = artifact.labels
            .map((role: unknown) => (typeof role === 'string' ? (LEGACY_HEAD_LABEL_ALIASES[role] ?? role) : role))
            .filter(
                (role: unknown) =>
                    typeof role === 'string' &&
                    role !== 'unknown' &&
                    role !== 'REVIEW_ME' &&
                    !Object.prototype.hasOwnProperty.call(SEMANTIC_ROLE_REGISTRY, role)
            );
        expect(missing).toEqual([]);
    });
    it.each([Number.NaN, -1, 2])('rejects an invalid conformal quantile %s', (conformalQuantile) => {
        if (!head.calibration) {
            throw new Error('Fixture requires calibration');
        }
        expect(() => classifier(head.intercept, { calibration: { ...head.calibration, conformalQuantile } })).toThrow(
            /calibration|contract/u
        );
    });
    it('rejects a head without actual abstention outputs', () => {
        expect(() =>
            createEmbeddingSemanticClassifier({
                fingerprint: 'test',
                head: {
                    ...head,
                    labels: ['email'],
                    coef: [[0]],
                    intercept: [0],
                    tokenizerSha256: 'b'.repeat(64),
                    serializerFingerprint: FIELD_CONTEXT_SERIALIZER_FINGERPRINT
                },
                embedder: { embed: async () => [[0]] },
                serializeV3Input: serializeFieldContextV3,
                v3Roles: SEMANTIC_ROLE_REGISTRY,
                v3RegistryFingerprint: SEMANTIC_ROLE_REGISTRY_FINGERPRINT,
                v3SerializerFingerprint: FIELD_CONTEXT_SERIALIZER_FINGERPRINT
            })
        ).toThrow(/contract/u);
    });
    it('requires the serializer and tokenizer artifact contract for v3', () => {
        expect(() =>
            createEmbeddingSemanticClassifier({
                fingerprint: 'test',
                head,
                embedder: { embed: async () => [[0]] },
                serializeV3Input: serializeFieldContextV3,
                v3Roles: SEMANTIC_ROLE_REGISTRY,
                v3RegistryFingerprint: SEMANTIC_ROLE_REGISTRY_FINGERPRINT
            })
        ).toThrow(/contract/u);
    });
    it('renders field identity as words and leaves verbose annotations out of the encoder text', () => {
        const serialized = serializeFieldContextV3({
            ...context,
            annotations: [{ term: 'Verbose', value: 'noise '.repeat(1000) }]
        });
        expect(serialized).toBe('Email (string, required) in Contact; a email field');
        expect(serialized).not.toContain('noise');
    });
    it('splits technical identifiers into words for the sentence encoder', () => {
        const serialized = serializeFieldContextV3({
            ...context,
            propertyName: 'BookingStatus_code',
            entityName: 'TravelBookings',
            dataElement: 'BOOK_STATUS'
        });
        expect(serialized).toBe(
            'Booking Status code (string, required) in Travel Bookings; data element BOOK STATUS; a code field'
        );
    });
    it('preserves a winning abstention instead of selecting a losing role', async () => {
        const result = await classifier().classify(context, new AbortController().signal);
        expect(result.role).toBe('unknown');
    });
    it('uses the stricter role and family calibration for routing', async () => {
        const result = await classifier([0, 10]).classify(context, new AbortController().signal);
        expect(result.routeThreshold).toBe(0.99);
    });
    it('uses an independently gated lexical fallback after classifier abstention', () => {
        const graph = parseEdmx(
            `<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0"><edmx:DataServices><Schema Namespace="Test" xmlns="http://docs.oasis-open.org/odata/ns/edm"><EntityType Name="Contact"><Key><PropertyRef Name="ID"/></Key><Property Name="ID" Type="Edm.Int32" Nullable="false"/><Property Name="Email" Type="Edm.String"/></EntityType><EntityContainer Name="Container"><EntitySet Name="Contacts" EntityType="Test.Contact"/></EntityContainer></Schema></edmx:DataServices></edmx:Edmx>`
        );
        const result = arbitrateSemanticClassifications(
            graph,
            new Map([
                [
                    'Contacts.Email',
                    {
                        role: 'email',
                        confidence: 0.000045,
                        source: 'classifier',
                        routeThreshold: 0.4,
                        predictionSetSize: 1,
                        top: [
                            { role: 'unknown', confidence: 0.9999 },
                            { role: 'email', confidence: 0.000045 }
                        ]
                    }
                ]
            ])
        );
        expect(result.get('Contacts.Email')?.role).toBe('email');
        expect(result.get('Contacts.Email')?.source).toBe('lexical-fallback');
    });
    it('does not accept a classifier role when its top result is an abstention marker', () => {
        const graph = directGraph([property('Email', 'string')], 'Contact');
        const result = arbitrateSemanticClassifications(
            graph,
            new Map([
                [
                    'Contacts.Email',
                    {
                        role: 'email',
                        confidence: 0.99,
                        source: 'classifier',
                        routeThreshold: 0.4,
                        predictionSetSize: 1,
                        top: [
                            { role: 'unknown', confidence: 0.9999 },
                            { role: 'email', confidence: 0.99 }
                        ]
                    }
                ]
            ])
        );
        expect(result.get('Contacts.Email')?.role).toBe('email');
        expect(result.get('Contacts.Email')?.source).toBe('lexical-fallback');
    });
    it('does not accept an ambiguous prediction set when only its size is supplied', () => {
        const graph = directGraph([property('Email', 'string')], 'Contact');
        const result = arbitrateSemanticClassifications(
            graph,
            new Map([
                [
                    'Contacts.Email',
                    {
                        role: 'email',
                        confidence: 0.99,
                        source: 'classifier',
                        routeThreshold: 0.4,
                        predictionSetSize: 2,
                        top: [{ role: 'email', confidence: 0.99 }]
                    }
                ]
            ])
        );
        expect(result.get('Contacts.Email')?.role).toBe('email');
        expect(result.get('Contacts.Email')?.source).toBe('lexical-fallback');
    });
    it('uses the lexical person role when FirstName classifier confidence is below threshold', () => {
        const graph = directGraph([property('FirstName', 'string')], 'Contact');
        const result = arbitrateSemanticClassifications(
            graph,
            new Map([
                [
                    'Contacts.FirstName',
                    {
                        role: 'person_last_name',
                        confidence: 0.1,
                        source: 'classifier',
                        routeThreshold: 0.9,
                        predictionSetSize: 1,
                        predictionSet: ['person_last_name'],
                        top: [{ role: 'person_last_name', confidence: 0.1 }]
                    }
                ]
            ])
        );
        expect(result.get('Contacts.FirstName')?.role).toBe('person_first_name');
        expect(result.get('Contacts.FirstName')?.source).toBe('lexical-fallback');
    });
    it('uses safe FirstName lexical evidence for a same-role low-confidence result', () => {
        const graph = directGraph([property('FirstName', 'string')], 'Contact');
        // Below the head's own calibrated threshold: the classifier cannot route, the precise
        // person-name lexical rule can.
        const result = arbitrateSemanticClassifications(
            graph,
            new Map([
                [
                    'Contacts.FirstName',
                    {
                        role: 'person_first_name',
                        confidence: 0.373,
                        source: 'classifier',
                        routeThreshold: 0.4,
                        predictionSetSize: 1,
                        top: [{ role: 'person_first_name', confidence: 0.373 }]
                    }
                ]
            ])
        );
        expect(result.get('Contacts.FirstName')?.role).toBe('person_first_name');
        expect(result.get('Contacts.FirstName')?.source).toBe('lexical-fallback');
    });
    it('falls back to generic business identifiers for unknown TravelID and AgencyID', () => {
        const graph = directGraph([property('TravelID', 'string'), property('AgencyID', 'string')]);
        const learned = new Map([
            ['Travels.TravelID', unknownClassification()],
            ['Travels.AgencyID', unknownClassification()]
        ]);
        const result = arbitrateSemanticClassifications(graph, learned);
        expect(result.get('Travels.TravelID')?.role).toBe('business_identifier');
        expect(result.get('Travels.AgencyID')?.role).toBe('business_identifier');
        expect(result.get('Travels.TravelID')?.source).toBe('lexical-fallback');
    });
    it('no longer routes numeric_identifier from name wording alone', () => {
        // The numeric-identifier rule contradicted adjudicated status, region and document labels
        // on the train/calibration fields (0/7), so its lexical fallback is off.
        const graph = directGraph([property('CustomerID', 'string')]);
        const result = arbitrateSemanticClassifications(
            graph,
            new Map([['Travels.CustomerID', unknownClassification()]])
        );
        expect(result.get('Travels.CustomerID')?.role).not.toBe('numeric_identifier');
    });
    it('routes a time-typed column from its name when the classifier has no usable answer', () => {
        // A column declared `time` and named as a time carries two independent pieces of evidence.
        // `time` stays out of name-only routing, but a declared type is not a name.
        const graph = directGraph([property('DepartureTime', 'time'), property('ArrivalTime', 'string')]);
        const result = arbitrateSemanticClassifications(
            graph,
            new Map([
                ['Travels.DepartureTime', unknownClassification()],
                ['Travels.ArrivalTime', unknownClassification()]
            ])
        );
        expect(result.get('Travels.DepartureTime')).toMatchObject({ role: 'time', source: 'lexical-fallback' });
        expect(result.get('Travels.ArrivalTime')?.role).not.toBe('time');
    });
    it('routes an integer RAP `_fc` field-control property when the classifier has no usable answer', () => {
        const graph = directGraph([property('BookingFee_fc', 'int'), property('BookingFeeControl', 'int')]);
        const result = arbitrateSemanticClassifications(
            graph,
            new Map([
                ['Travels.BookingFee_fc', unknownClassification()],
                ['Travels.BookingFeeControl', unknownClassification()]
            ])
        );
        expect(result.get('Travels.BookingFee_fc')).toMatchObject({
            role: 'field_control',
            source: 'lexical-fallback'
        });
        // Without the framework suffix the name alone stays behind the lexical precision gate.
        expect(result.get('Travels.BookingFeeControl')?.role).not.toBe('field_control');
    });
    it('abstains on framework bookkeeping fields whatever the classifier says', () => {
        const graph = directGraph([
            property('HasActiveEntity', 'bool'),
            property('DraftEntityCreationDateTime', 'datetime'),
            property('Update_ac', 'bool'),
            property('IsConfirmed', 'bool')
        ]);
        const confident = (role: string) => ({
            role,
            confidence: 0.97,
            source: 'classifier' as const,
            routeThreshold: 0.5,
            predictionSetSize: 1,
            predictionSet: [role],
            top: [{ role, confidence: 0.97 }]
        });
        const result = arbitrateSemanticClassifications(
            graph,
            new Map([
                ['Travels.HasActiveEntity', confident('boolean_flag')],
                ['Travels.DraftEntityCreationDateTime', confident('datetime')],
                ['Travels.Update_ac', confident('boolean_flag')],
                ['Travels.IsConfirmed', confident('boolean_flag')]
            ])
        );
        for (const key of ['Travels.HasActiveEntity', 'Travels.DraftEntityCreationDateTime', 'Travels.Update_ac']) {
            expect(result.get(key)?.role).toBe('unknown');
            expect(result.get(key)?.abstentionReason).toBe('technical-field');
        }
        expect(result.get('Travels.IsConfirmed')?.role).toBe('boolean_flag');
    });
    it('routes a calibrated v3 decision on the head threshold, not the registry default', () => {
        const graph = directGraph([property('BookingStatus_code', 'string')]);
        const result = arbitrateSemanticClassifications(
            graph,
            new Map([
                [
                    'Travels.BookingStatus_code',
                    {
                        role: 'status',
                        confidence: 0.88,
                        source: 'classifier',
                        routeThreshold: 0.5555,
                        predictionSetSize: 1,
                        predictionSet: ['status'],
                        top: [
                            { role: 'status', confidence: 0.88 },
                            { role: 'unknown', confidence: 0.12 }
                        ]
                    }
                ]
            ])
        );
        expect(result.get('Travels.BookingStatus_code')?.role).toBe('status');
        expect(result.get('Travels.BookingStatus_code')?.source).toBe('classifier');
    });
    it('keeps the registry default for a classifier decision that carries no threshold', () => {
        const graph = directGraph([property('BookingStatus_code', 'string')]);
        const result = arbitrateSemanticClassifications(
            graph,
            new Map([
                [
                    'Travels.BookingStatus_code',
                    {
                        role: 'status',
                        confidence: 0.88,
                        source: 'classifier',
                        predictionSetSize: 1,
                        top: [{ role: 'status', confidence: 0.88 }]
                    }
                ]
            ])
        );
        expect(result.get('Travels.BookingStatus_code')?.role).toBe('unknown');
    });
    it('recognizes an agency display name as an organization with entity and text-link evidence', () => {
        const graph = directGraph(
            [property('AgencyID', 'string', { links: { text: 'AgencyName' } }), property('AgencyName', 'string')],
            'TravelAgencyType'
        );
        const result = arbitrateSemanticClassifications(
            graph,
            new Map([['TravelAgencyTypes.AgencyName', unknownClassification()]])
        );
        expect(result.get('TravelAgencyTypes.AgencyName')?.role).toBe('org_name');
        expect(result.get('TravelAgencyTypes.AgencyName')?.source).toBe('lexical-fallback');
    });
    it('accepts explicit numeric identifier metadata over generic ID wording', () => {
        const graph = directGraph([
            property('TravelID', 'string', {
                annotations: [{ term: 'sap:display-format', value: 'NonNegative' }]
            })
        ]);
        const result = arbitrateSemanticClassifications(
            graph,
            new Map([['Travels.TravelID', unknownClassification()]])
        );
        expect(result.get('Travels.TravelID')?.role).toBe('numeric_identifier');
        expect(result.get('Travels.TravelID')?.source).toBe('metadata');
    });
    it('accepts a decimal currency-linked property as a monetary amount', () => {
        const graph = directGraph([
            property('BookingFee', 'decimal', {
                links: { currency: 'CurrencyCode' }
            })
        ]);
        const result = arbitrateSemanticClassifications(
            graph,
            new Map([['Travels.BookingFee', unknownClassification()]])
        );
        expect(result.get('Travels.BookingFee')?.role).toBe('monetary_amount');
        expect(result.get('Travels.BookingFee')?.source).toBe('metadata');
    });
    it('accepts a currency code property from normalized code-list metadata', () => {
        const graph = directGraph(
            [property('CurrencyCode', 'string', { links: { standardCode: 'ISO4217' } })],
            'CurrencyCode',
            'currency'
        );
        const result = arbitrateSemanticClassifications(
            graph,
            new Map([['CurrencyCodes.CurrencyCode', unknownClassification()]])
        );
        expect(result.get('CurrencyCodes.CurrencyCode')?.role).toBe('currency');
        expect(result.get('CurrencyCodes.CurrencyCode')?.source).toBe('metadata');
    });
    it('uses currency code text-link evidence for the companion currency name', () => {
        const graph = directGraph(
            [
                property('Currency', 'string', { links: { text: 'Currency_Text', standardCode: 'ISO4217' } }),
                property('Currency_Text', 'string')
            ],
            'Currency',
            'currency'
        );
        const result = arbitrateSemanticClassifications(
            graph,
            new Map([['Currencys.Currency_Text', unknownClassification()]])
        );
        expect(result.get('Currencys.Currency_Text')?.role).toBe('currency_name');
        expect(result.get('Currencys.Currency_Text')?.source).toBe('metadata');
    });
    it('allows date roles on normalized datetime properties', () => {
        const graph = directGraph([property('EndDate', 'datetime')]);
        const result = arbitrateSemanticClassifications(graph, new Map([['Travels.EndDate', unknownClassification()]]));
        expect(result.get('Travels.EndDate')?.role).toBe('end_date');
        expect(result.get('Travels.EndDate')?.source).toBe('lexical-fallback');
    });
    it.each([
        ['CreatedOn', 'date', 'date'],
        ['ChangedAt', 'datetime', 'datetime'],
        ['LocalTime', 'time', 'time'],
        ['PartnerReference', 'string', 'business_partner_id']
    ] as const)('keeps a supported classifier label %s through semantic routing', (name, primitiveType, role) => {
        const graph = directGraph([property(name, primitiveType)], 'Record');
        const result = arbitrateSemanticClassifications(
            graph,
            new Map([
                [
                    `Records.${name}`,
                    {
                        role,
                        confidence: 0.99,
                        source: 'classifier',
                        routeThreshold: 0.4,
                        predictionSetSize: 1,
                        predictionSet: [role],
                        top: [{ role, confidence: 0.99 }]
                    }
                ]
            ])
        );
        expect(result.get(`Records.${name}`)?.role).toBe(role);
        expect(result.get(`Records.${name}`)?.source).toBe('classifier');
    });
    it('does not silently accept an unqualified business status label', () => {
        const graph = directGraph([property('OverallStatusText', 'string')]);
        const result = arbitrateSemanticClassifications(
            graph,
            new Map([['Travels.OverallStatusText', unknownClassification()]])
        );
        expect(result.get('Travels.OverallStatusText')?.role).toBe('unknown');
        expect(result.get('Travels.OverallStatusText')?.source).toBe('unknown');
    });
    it.each(['cost_center', 'fiscal_period', 'tax_code'] as const)(
        'detects %s without binding an invented business domain',
        (role) => {
            const graph = directGraph([property('OpaqueCode', 'string')], 'Record');
            const detected = arbitrateSemanticClassifications(
                graph,
                new Map([
                    [
                        'Records.OpaqueCode',
                        {
                            role,
                            confidence: 0.99,
                            source: 'classifier',
                            routeThreshold: 0.4,
                            predictionSetSize: 1,
                            predictionSet: [role],
                            top: [{ role, confidence: 0.99 }]
                        }
                    ]
                ])
            );
            expect(detected.get('Records.OpaqueCode')?.role).toBe(role);
            const planned = compileSemanticPlan(graph, detected, []);
            expect(planned.get('Records.OpaqueCode')?.role).toBe('unknown');
            expect(planned.get('Records.OpaqueCode')?.abstentionReason).toBe('unsupported-domain');
        }
    );
    it('does not infer organization semantics from an ambiguous CustomerName alone', () => {
        const graph = directGraph([property('CustomerName', 'string')]);
        const result = arbitrateSemanticClassifications(
            graph,
            new Map([['Travels.CustomerName', unknownClassification()]])
        );
        expect(result.get('Travels.CustomerName')?.role).toBe('unknown');
    });
});
