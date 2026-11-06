import { compareCodePoints } from '../ordering.js';
import { semanticRules } from '../semantics/rule-store.js';
import { checkCodeTexts, checkConstantColumns } from './realism-codes.js';
import { checkFacets } from './realism-facets.js';
import { checkReservedHosts } from './realism-hosts.js';
import { checkDraftStates } from './realism-drafts.js';
import { checkGeography } from './realism-geography.js';
import { checkRecordRows } from './realism-records.js';
import {
    checkIdentifiers,
    checkReferenceCopies,
    checkReferenceTexts,
    checkSemanticKeys
} from './realism-references.js';
import { checkTemporal } from './realism-temporal.js';
import { checkUnitFields } from './realism-units.js';
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
 * Check the final rows of one service for values no real data would hold (placeholders, leaked names, incoherent codes,
 * geography, dates, references, units, facets), reading only the schema and the rows. The realism guard withholds what
 * the placeholder and name-leak checks flag, so read `REALISM_VALUE_WITHHELD` for those.
 *
 * @param input schema, rows, and optionally which rows the caller supplied and geography references
 * @returns findings per field and how much each check examined
 */
export function assessRealism(input: RealismInput): RealismAssessment {
    const runs = (check: RealismCheck): boolean => input.checks?.has(check) ?? true;
    const skipped: CheckOutcome = { findings: [], coverage: { fields: 0, cells: 0 } };
    const outcome = (check: RealismCheck, run: () => CheckOutcome): CheckOutcome => (runs(check) ? run() : skipped);
    const temporalChecks = [
        REALISM_CHECK.temporalOrder,
        REALISM_CHECK.temporalComposition,
        REALISM_CHECK.temporalIdentity,
        REALISM_CHECK.temporalTwin
    ];
    const temporal = temporalChecks.some(runs)
        ? checkTemporal(input)
        : { order: skipped, composition: skipped, identity: skipped, twin: skipped };
    const outcomes: Record<RealismCheck, CheckOutcome> = {
        [REALISM_CHECK.placeholder]: outcome(REALISM_CHECK.placeholder, () => checkPlaceholders(input)),
        [REALISM_CHECK.nameLeak]: outcome(REALISM_CHECK.nameLeak, () => checkNameLeaks(input)),
        [REALISM_CHECK.sharedText]: outcome(REALISM_CHECK.sharedText, () => checkSharedTexts(input)),
        [REALISM_CHECK.codeText]: outcome(REALISM_CHECK.codeText, () => checkCodeTexts(input)),
        [REALISM_CHECK.geography]: outcome(REALISM_CHECK.geography, () => checkGeography(input)),
        [REALISM_CHECK.temporalOrder]: outcome(REALISM_CHECK.temporalOrder, () => temporal.order),
        [REALISM_CHECK.temporalComposition]: outcome(REALISM_CHECK.temporalComposition, () => temporal.composition),
        [REALISM_CHECK.temporalIdentity]: outcome(REALISM_CHECK.temporalIdentity, () => temporal.identity),
        [REALISM_CHECK.constantColumn]: outcome(REALISM_CHECK.constantColumn, () => checkConstantColumns(input)),
        [REALISM_CHECK.referenceText]: outcome(REALISM_CHECK.referenceText, () => checkReferenceTexts(input)),
        [REALISM_CHECK.temporalTwin]: outcome(REALISM_CHECK.temporalTwin, () => temporal.twin),
        [REALISM_CHECK.referenceCopy]: outcome(REALISM_CHECK.referenceCopy, () => checkReferenceCopies(input)),
        [REALISM_CHECK.semanticKeyUnique]: outcome(REALISM_CHECK.semanticKeyUnique, () => checkSemanticKeys(input)),
        [REALISM_CHECK.identifierUnique]: outcome(REALISM_CHECK.identifierUnique, () => checkIdentifiers(input)),
        [REALISM_CHECK.recordConsistency]: outcome(REALISM_CHECK.recordConsistency, () =>
            checkRecordRows(input, semanticRules().realismChecks.minimumPatternRows)
        ),
        [REALISM_CHECK.unitField]: outcome(REALISM_CHECK.unitField, () => checkUnitFields(input)),
        [REALISM_CHECK.facet]: outcome(REALISM_CHECK.facet, () => checkFacets(input)),
        [REALISM_CHECK.reservedHost]: outcome(REALISM_CHECK.reservedHost, () => checkReservedHosts(input)),
        [REALISM_CHECK.draftState]: outcome(REALISM_CHECK.draftState, () => checkDraftStates(input))
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
