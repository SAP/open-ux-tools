import type { SchemaGraph } from '../schema/graph.js';
import type { JsonValue, MockDataRow } from '../types.js';

/** Version of the realism checks; reports of different versions are not comparable. */
export const REALISM_CHECKS_VERSION = 6;

/** The realism checks, each a property of final rows that holds for real data of any service. */
export const REALISM_CHECK = {
    /** A text value is a name the service uses plus a number (`Unit Price 1`), or a column counts up such a name. */
    placeholder: 'placeholder',
    /** A value is the name or label of something in the service (`OrdItmLastChgdByUser`). */
    nameLeak: 'name-leak',
    /** Two fields about unrelated subjects share the same multi-word values (one generic list fills both). */
    sharedText: 'shared-text',
    /** The text of a code is not a function of the code, or holds codes instead of text. */
    codeText: 'code-text',
    /** A geographic value (city, phone, bank identifier, time zone) belongs to none of its row's countries. */
    geography: 'geography',
    /** A start, creation or validity-from value lies after its end, change or validity-to value. */
    temporalOrder: 'temporal-order',
    /** A timestamp disagrees with the date or time field of the same name, or is always midnight. */
    temporalComposition: 'temporal-composition',
    /** A creation value equals its change value in every row. */
    temporalIdentity: 'temporal-identity',
    /** A non-key, non-enumerated column holds one value in every row. */
    constantColumn: 'constant-column'
} as const;
export type RealismCheck = (typeof REALISM_CHECK)[keyof typeof REALISM_CHECK];

/**
 * The checks no generated row may fail: each states what real data of any service holds. The others report
 * what may be legitimate in a particular service (one company code, records never changed) or need a
 * baseline to read.
 */
export const REALISM_HARD_CHECKS: ReadonlySet<RealismCheck> = new Set([
    REALISM_CHECK.placeholder,
    REALISM_CHECK.nameLeak,
    REALISM_CHECK.codeText,
    REALISM_CHECK.temporalOrder
]);

/** One field that fails one check. */
export interface RealismFinding {
    check: RealismCheck;
    entitySet: string;
    property: string;
    /** Cells of the field that fail the check. */
    failingCells: number;
    /** Cells of the field the check examined. */
    checkedCells: number;
    /** Up to three failing values, truncated. */
    examples: string[];
    /** The other field involved, for checks over field pairs. */
    related?: string;
}

/** How much a check examined. */
export interface RealismCoverage {
    fields: number;
    cells: number;
}

/** Reference tables of the geography check, built from a source independent of the generator. */
export interface GeographyReferences {
    /** ISO 3166-1 alpha-2 region codes. */
    regions: ReadonlySet<string>;
    /** International calling code digits to the regions that use it (`358` to FI and AX). */
    callingCodes: ReadonlyMap<string, ReadonlySet<string>>;
    /** Lowercase city names to their regions. */
    cityRegions: ReadonlyMap<string, ReadonlySet<string>>;
    /** IANA time zone identifiers to their regions. */
    zoneRegions: ReadonlyMap<string, ReadonlySet<string>>;
}

/** What the checks read. */
export interface RealismInput {
    graph: SchemaGraph;
    resources: Readonly<Record<string, ReadonlyArray<MockDataRow>>>;
    /** Rows the caller supplied are not the generator's to answer for; they are skipped. */
    isSupplied?: (entitySet: string, rowIndex: number) => boolean;
    /** Without references the geography check is skipped. */
    geography?: GeographyReferences;
    /** The checks to run; all of them when absent. A check not run reports no finding and examines nothing. */
    checks?: ReadonlySet<RealismCheck>;
}

/** The result of one check. */
export interface CheckOutcome {
    findings: RealismFinding[];
    coverage: RealismCoverage;
}

/** The result of all checks over one service. */
export interface RealismAssessment {
    version: typeof REALISM_CHECKS_VERSION;
    findings: RealismFinding[];
    coverage: Record<RealismCheck, RealismCoverage>;
}

const EXAMPLE_LENGTH = 60;

/**
 * A value as it appears in a finding: JSON text, truncated.
 *
 * @param value cell value
 * @returns the example text
 */
export function exampleOf(value: JsonValue | undefined): string {
    const text = typeof value === 'string' ? value : JSON.stringify(value);
    return text.length > EXAMPLE_LENGTH ? `${text.slice(0, EXAMPLE_LENGTH - 1)}…` : text;
}

/**
 * The generated rows of an entity set with their positions, without the rows the caller supplied.
 *
 * @param input check input
 * @param entitySet entity set name
 * @returns the rows to check
 */
export function generatedRows(input: RealismInput, entitySet: string): MockDataRow[] {
    const rows = input.resources[entitySet] ?? [];
    return rows.filter((_row, index) => !input.isSupplied?.(entitySet, index));
}

/** Collects findings and coverage of one check. */
export class OutcomeCollector {
    private readonly findings: RealismFinding[] = [];
    private fields = 0;
    private cells = 0;

    /**
     * @param check the check whose outcome is collected
     */
    constructor(private readonly check: RealismCheck) {}

    /**
     * Count one examined field and record it as a finding when cells fail.
     *
     * @param field the field and what was examined
     * @param field.entitySet entity set name
     * @param field.property property name
     * @param field.checked values examined
     * @param field.failing values that fail
     * @param field.related the other field of a pair check
     */
    field(field: {
        entitySet: string;
        property: string;
        checked: number;
        failing: ReadonlyArray<JsonValue | undefined>;
        related?: string;
    }): void {
        if (field.checked === 0) {
            return;
        }
        this.fields++;
        this.cells += field.checked;
        if (field.failing.length > 0) {
            this.findings.push({
                check: this.check,
                entitySet: field.entitySet,
                property: field.property,
                failingCells: field.failing.length,
                checkedCells: field.checked,
                examples: [...new Set(field.failing.map(exampleOf))].slice(0, 3),
                ...(field.related ? { related: field.related } : {})
            });
        }
    }

    /**
     * @returns the collected outcome
     */
    outcome(): CheckOutcome {
        return { findings: this.findings, coverage: { fields: this.fields, cells: this.cells } };
    }
}
