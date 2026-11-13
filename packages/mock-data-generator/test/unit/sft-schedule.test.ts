import { generateServiceForTesting } from '../../src/index.js';
import type { SftGenerationInput, SftGenerator } from '../../src/types.js';

const remarks = ['Remark', 'Comment', 'Summary', 'Detail', 'Notice', 'Memo', 'Annotation', 'Caption'];
const metadata = `<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0"><edmx:DataServices><Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="Demo">
<EntityType Name="Ledger"><Key><PropertyRef Name="ID"/></Key>
<Property Name="ID" Type="Edm.Int32" Nullable="false"/>
${remarks.map((name) => `<Property Name="${name}" Type="Edm.String" MaxLength="60"/>`).join('\n')}
</EntityType>
${[1, 2, 3, 4]
    .map(
        (index) => `<EntityType Name="Note${index}"><Key><PropertyRef Name="ID"/></Key>
<Property Name="ID" Type="Edm.Int32" Nullable="false"/>
<Property Name="Remark" Type="Edm.String" MaxLength="60"/>
</EntityType>`
    )
    .join('\n')}
<EntityContainer Name="Container"><EntitySet Name="Ledgers" EntityType="Demo.Ledger"/>${[1, 2, 3, 4]
    .map((index) => `<EntitySet Name="Notes${index}" EntityType="Demo.Note${index}"/>`)
    .join('')}</EntityContainer>
</Schema></edmx:DataServices></edmx:Edmx>`;
const request = {
    metadata: { format: 'edmx', content: metadata },
    service: { urlPath: '/ledgers', odataVersion: '4.0' },
    targets: ['Ledgers', 'Notes1', 'Notes2', 'Notes3', 'Notes4'].map((name) => ({ name, kind: 'entity-set' as const })),
    existingData: {}
} as const;

/** Simulated model time of one field in one call, in milliseconds, as on a slow two-core workspace. */
const SIMULATED_MS_PER_FIELD = 1_000;

/**
 * A model double for a slow machine: each call costs a fixed time per field and only the calls that end
 * within the request's budget return their fields, as the packaged generator does. No time passes.
 *
 * @param budgets receives the budget of each request by entity
 * @returns the generator double
 */
function slowModel(budgets: Map<string, number>): SftGenerator {
    return {
        fingerprint: 'slow-model',
        generate: async (input: SftGenerationInput) => {
            budgets.set(input.entityName, input.budgetMs ?? 0);
            const perCall = input.maxFieldsPerPrompt ?? 8;
            const completed: string[] = [];
            let spentMs = 0;
            for (let start = 0; start < input.fields.length; start += perCall) {
                const call = input.fields.slice(start, start + perCall);
                spentMs += call.length * SIMULATED_MS_PER_FIELD;
                if (spentMs > (input.budgetMs ?? 0)) {
                    break;
                }
                completed.push(...call.map(({ name }) => name));
            }
            return {
                rows: Array.from({ length: input.rowCount }, (_unused, row) =>
                    Object.fromEntries(completed.map((name) => [name, `${name} text ${row}`]))
                )
            };
        }
    };
}

/**
 * Generate the service with the slow model double.
 *
 * @param options the generation options besides the shared ones
 * @param budgets receives the budget of each request by entity
 * @returns the generation result
 */
function generate(
    options: Parameters<typeof generateServiceForTesting>[1],
    budgets: Map<string, number>
): ReturnType<typeof generateServiceForTesting> {
    return generateServiceForTesting(
        request,
        { seed: 3, rowsPerEntity: 2, sftTimeoutMs: 30_000, sftPriorityTargets: ['Ledgers'], ...options },
        { sft: slowModel(budgets) }
    );
}

describe('fine-tuned time budget', () => {
    it('gives a wide displayed resource the time to finish a call instead of an even share', async () => {
        // Given a wide displayed resource and four narrow ones, on a machine where eight fields take eight
        // seconds, with a ten second service budget
        const budgets = new Map<string, number>();

        // When the service is generated
        const result = await generate({ sftBudgetMs: 10_000 }, budgets);

        // Then the wide resource may use what remains of the budget, so its first call ends and its fields
        // keep the model's values
        expect(budgets.get('Ledger')).toBeGreaterThan(8_000);
        const ledger = result.resources.Ledgers[0];
        expect(remarks.filter((name) => ledger[name] === `${name} text 0`)).toHaveLength(remarks.length);
    });

    it('leaves the unused time of a resource to the resources after it', async () => {
        // Given a budget the wide resource does not need in full
        const budgets = new Map<string, number>();

        // When the service is generated
        await generate({ sftBudgetMs: 20_000 }, budgets);

        // Then each narrow resource after it is offered what remains, not a share fixed in advance
        for (const entity of ['Note1', 'Note2', 'Note3', 'Note4']) {
            expect(budgets.get(entity)).toBeGreaterThan(10_000);
        }
    });

    it('asks for fewer fields per call when the caller sets it, so a short budget still keeps some values', async () => {
        // Given a budget too short for a call of eight fields
        const budgets = new Map<string, number>();

        // When the model is asked for three fields per call
        const result = await generate({ sftBudgetMs: 7_000, sftFieldsPerCall: 3 }, budgets);

        // Then the calls that ended keep their six fields and the last two keep their fallback
        const ledger = result.resources.Ledgers[0];
        expect(remarks.filter((name) => ledger[name] === `${name} text 0`)).toEqual(remarks.slice(0, 6));
        expect(result.statistics.sft.acceptedSlots).toBeGreaterThanOrEqual(2 * 6);
    });

    it('rejects a fields-per-call option that is not a positive integer', async () => {
        await expect(generateServiceForTesting(request, { rowsPerEntity: 1, sftFieldsPerCall: 0 })).rejects.toThrow(
            'SFT fields per call'
        );
    });
});
