import { compareCodePoints } from '../ordering.js';
import { checkCodeTexts, checkConstantColumns } from './realism-codes.js';
import { checkGeography } from './realism-geography.js';
import { checkTemporal } from './realism-temporal.js';
import { checkNameLeaks, checkPlaceholders, checkSharedTexts } from './realism-text.js';
import { REALISM_CHECK, REALISM_CHECKS_VERSION } from './realism-types.js';
import type { CheckOutcome, RealismAssessment, RealismCheck, RealismInput } from './realism-types.js';

export { REALISM_CHECK, REALISM_CHECKS_VERSION, REALISM_HARD_CHECKS } from './realism-types.js';
export type {
    GeographyReferences,
    RealismAssessment,
    RealismCheck,
    RealismCoverage,
    RealismFinding,
    RealismInput
} from './realism-types.js';

/**
 * Check the final rows of one service for values no real data of any service would hold: placeholders,
 * leaked names, one generic list filling unrelated fields, texts that are not functions of their codes,
 * geography that disagrees with its row, impossible or degenerate dates, and constant columns.
 *
 * The checks read only the schema and the rows, never how the generator chose a value. They name no field of
 * any particular service: they key on types, facets, annotations, relationships and the service's own names.
 * One exception to their independence: the generator's realism guard withholds the values the placeholder
 * and name-leak tests flag, so on generated rows those two checks pass by construction; the withheld cells
 * (`REALISM_VALUE_WITHHELD`) are what to read for them.
 *
 * @param input schema, rows, and optionally which rows the caller supplied and geography references
 * @returns findings per field and how much each check examined
 * @example
 * const assessment = assessRealism({ graph, resources: result.resources });
 * const placeholders = assessment.findings.filter(({ check }) => check === REALISM_CHECK.placeholder);
 */
export function assessRealism(input: RealismInput): RealismAssessment {
    const runs = (check: RealismCheck): boolean => input.checks?.has(check) ?? true;
    const skipped: CheckOutcome = { findings: [], coverage: { fields: 0, cells: 0 } };
    const outcome = (check: RealismCheck, run: () => CheckOutcome): CheckOutcome => (runs(check) ? run() : skipped);
    const temporalChecks = [
        REALISM_CHECK.temporalOrder,
        REALISM_CHECK.temporalComposition,
        REALISM_CHECK.temporalIdentity
    ];
    const temporal = temporalChecks.some(runs)
        ? checkTemporal(input)
        : { order: skipped, composition: skipped, identity: skipped };
    const outcomes: Record<RealismCheck, CheckOutcome> = {
        [REALISM_CHECK.placeholder]: outcome(REALISM_CHECK.placeholder, () => checkPlaceholders(input)),
        [REALISM_CHECK.nameLeak]: outcome(REALISM_CHECK.nameLeak, () => checkNameLeaks(input)),
        [REALISM_CHECK.sharedText]: outcome(REALISM_CHECK.sharedText, () => checkSharedTexts(input)),
        [REALISM_CHECK.codeText]: outcome(REALISM_CHECK.codeText, () => checkCodeTexts(input)),
        [REALISM_CHECK.geography]: outcome(REALISM_CHECK.geography, () => checkGeography(input)),
        [REALISM_CHECK.temporalOrder]: outcome(REALISM_CHECK.temporalOrder, () => temporal.order),
        [REALISM_CHECK.temporalComposition]: outcome(REALISM_CHECK.temporalComposition, () => temporal.composition),
        [REALISM_CHECK.temporalIdentity]: outcome(REALISM_CHECK.temporalIdentity, () => temporal.identity),
        [REALISM_CHECK.constantColumn]: outcome(REALISM_CHECK.constantColumn, () => checkConstantColumns(input))
    };
    const findings = Object.values(outcomes)
        .flatMap(({ findings: found }) => found)
        .sort(
            (left, right) =>
                compareCodePoints(left.check, right.check) ||
                compareCodePoints(left.entitySet, right.entitySet) ||
                compareCodePoints(left.property, right.property)
        );
    const coverage = Object.fromEntries(
        Object.entries(outcomes).map(([check, outcome]) => [check, outcome.coverage])
    ) as RealismAssessment['coverage'];
    return { version: REALISM_CHECKS_VERSION, findings, coverage };
}
