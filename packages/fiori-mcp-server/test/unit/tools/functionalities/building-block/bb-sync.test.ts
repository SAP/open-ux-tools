import { BuildingBlockType, AGGREGATION_CHILD_BB_TYPES } from '@sap-ux/fe-fpm-writer';
import { buildBuildingBlockMembers } from '../../../../../src/tools/functionalities/building-block/schema.js';
import {
    AGGREGATION_PARENT_MACRO,
    ANNOTATION_SHELL_TERMS,
    BB_TYPE_MIN_UI5_VERSION
} from '../../../../../src/tools/functionalities/building-block/utils.js';

// Appended to every failure message so the developer knows exactly what to do next.
const SKILL_HINT = 'Run the skill to wire it in: .agents/skills/mcp-add-bb-support/SKILL.md';

function failWith(message: string): never {
    throw new Error(`${message}\n${SKILL_HINT}`);
}

const ALL_TYPES = Object.values(BuildingBlockType);

// These tests fail when a new BuildingBlockType is added to fe-fpm-writer but not wired into
// fiori-mcp-server. The error message names the missing type and points to the skill.
// translate.ts (POSITION_WRAP_TYPES, EMBEDDED_FRAGMENT_TYPES, field renames) is not covered here —
// those are judgment calls that must be reviewed manually when adding a new type (skill Step 4).
describe('fiori-mcp-server stays in sync with fe-fpm-writer BuildingBlockType', () => {
    test('every BuildingBlockType is registered in schema.ts', () => {
        const covered = new Set(Object.keys(buildBuildingBlockMembers()));
        const missing = ALL_TYPES.filter((type) => !covered.has(type));
        if (missing.length > 0) {
            failWith(`Missing types in schema.ts: ${missing.join(', ')}.`);
        }
    });

    test('every aggregation-child type has an AGGREGATION_PARENT_MACRO entry', () => {
        // Forward-completeness: the writer's AGGREGATION_CHILD_BB_TYPES (derived from BUILDING_BLOCK_CONFIG)
        // is the source of truth for which types are aggregation children. A new child added upstream must
        // get a parent-macro entry here or the tool inserts it at the wrong place. The parent-macro *string*
        // itself (e.g. 'Table') is mcp-specific and cannot be derived from the writer — it stays a manual
        // review item in the skill; this test only enforces that an entry exists.
        const wired = new Set(Object.keys(AGGREGATION_PARENT_MACRO));
        const missing = AGGREGATION_CHILD_BB_TYPES.filter((type) => !wired.has(type));
        if (missing.length > 0) {
            failWith(`Missing entries in AGGREGATION_PARENT_MACRO for aggregation children: ${missing.join(', ')}.`);
        }
    });

    test('every key in AGGREGATION_PARENT_MACRO is a valid BuildingBlockType', () => {
        // Catches stale entries left behind when a type is removed from fe-fpm-writer.
        const validTypes = new Set<string>(ALL_TYPES);
        const stale = Object.keys(AGGREGATION_PARENT_MACRO).filter((type) => !validTypes.has(type));
        if (stale.length > 0) {
            failWith(`Stale entries in AGGREGATION_PARENT_MACRO: ${stale.join(', ')}.`);
        }
    });

    // ANNOTATION_SHELL_TERMS and BB_TYPE_MIN_UI5_VERSION are stale-only (no forward-completeness check):
    // whether a new type drives an OData annotation, or is version-gated, is a judgment call the writer
    // does not expose as a machine-readable fact — forcing a guess would be worse than requiring the
    // developer to decide. The skill's discover-new-bb.md walks through both questions manually.
    test('every key in ANNOTATION_SHELL_TERMS is a valid BuildingBlockType', () => {
        const validTypes = new Set<string>(ALL_TYPES);
        const stale = Object.keys(ANNOTATION_SHELL_TERMS).filter((type) => !validTypes.has(type));
        if (stale.length > 0) {
            failWith(`Stale entries in ANNOTATION_SHELL_TERMS: ${stale.join(', ')}.`);
        }
    });

    test('every key in BB_TYPE_MIN_UI5_VERSION is a valid BuildingBlockType', () => {
        const validTypes = new Set<string>(ALL_TYPES);
        const stale = Object.keys(BB_TYPE_MIN_UI5_VERSION).filter((type) => !validTypes.has(type));
        if (stale.length > 0) {
            failWith(`Stale entries in BB_TYPE_MIN_UI5_VERSION: ${stale.join(', ')}.`);
        }
    });
});
