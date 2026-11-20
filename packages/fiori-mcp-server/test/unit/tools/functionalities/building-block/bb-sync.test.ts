import { BuildingBlockType } from '@sap-ux/fe-fpm-writer';
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

    test('every key in AGGREGATION_PARENT_MACRO is a valid BuildingBlockType', () => {
        // Catches stale entries left behind when a type is removed from fe-fpm-writer.
        const validTypes = new Set<string>(ALL_TYPES);
        const stale = Object.keys(AGGREGATION_PARENT_MACRO).filter((type) => !validTypes.has(type));
        if (stale.length > 0) {
            failWith(`Stale entries in AGGREGATION_PARENT_MACRO: ${stale.join(', ')}.`);
        }
    });

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
