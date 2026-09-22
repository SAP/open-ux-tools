import { semanticRowContext, semanticValue } from '../../src/semantics/value-banks.js';
import { generateService } from '../../src/index.js';
import { resolveSemanticClassifications } from '../../src/semantics/lexical-fallback.js';

describe('pipeline input contracts', () => {
    it('does not introduce semantic-v2 bank identifier rules into legacy routing', () => {
        const result = resolveSemanticClassifications(
            {
                namespace: 'Test',
                relationships: [],
                entities: [
                    {
                        name: 'Row',
                        entitySetName: 'Rows',
                        properties: [
                            {
                                name: 'BankInternalID',
                                primitiveType: 'string',
                                isKey: false,
                                nullable: false,
                                annotations: []
                            }
                        ]
                    }
                ]
            },
            new Map()
        );
        expect(result.get('Rows.BankInternalID')?.role).not.toBe('bank_account_internal_id');
    });
    it('does not provide an invented house-bank domain', () => {
        const property = {
            name: 'Value',
            primitiveType: 'string',
            nullable: false,
            isKey: false,
            annotations: []
        } as const;
        expect(semanticValue('house_bank', property, semanticRowContext(1), 1, 0)).toBeUndefined();
    });
    it('does not pass v3 contexts to the legacy classifier', async () => {
        const inputs: unknown[] = [];
        await generateService(
            {
                metadata: {
                    format: 'edmx',
                    content: `<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0"><edmx:DataServices><Schema Namespace="Test" xmlns="http://docs.oasis-open.org/odata/ns/edm"><EntityType Name="Row"><Key><PropertyRef Name="ID"/></Key><Property Name="ID" Type="Edm.Int32" Nullable="false"/></EntityType><EntityContainer Name="Container"><EntitySet Name="Rows" EntityType="Test.Row"/></EntityContainer></Schema></edmx:DataServices></edmx:Edmx>`
                },
                service: { urlPath: '/test', odataVersion: '4.0' },
                targets: [{ name: 'Rows', kind: 'entity-set' }],
                existingData: {}
            },
            { pipeline: 'legacy', rowsPerEntity: 1 },
            {
                classifier: {
                    fingerprint: 'test',
                    classify: async (input) => {
                        inputs.push(input);
                        return { role: 'unknown', confidence: 1, source: 'classifier' };
                    }
                }
            }
        );
        expect(inputs).toEqual([{ entityName: 'Row', propertyName: 'ID', primitiveType: 'int', annotations: [] }]);
    });
});
