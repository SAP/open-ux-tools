import * as zod from 'zod';
import { PromptsAPI, PromptsType, BuildingBlockType } from '@sap-ux/fe-fpm-writer';
import type { Editor } from 'mem-fs-editor';
import { logger } from '../../../utils/index.js';
import { buildHandWrittenMembers, composeBuildingBlockSchema, type BuildingBlockMemberSchema } from './schema.js';

/**
 * The building block types that fe-fpm-writer exposes prompts for (via PromptsAPI.getPrompts).
 * The remaining types — Field and the aggregation children (CustomColumn, CustomFilterField,
 * CustomFormField, Action) — have no prompts and keep their hand-written schemas.
 */
const BB_TYPE_TO_PROMPTS_TYPE: ReadonlyArray<[BuildingBlockType, PromptsType]> = [
    [BuildingBlockType.Table, PromptsType.Table],
    [BuildingBlockType.FilterBar, PromptsType.FilterBar],
    [BuildingBlockType.Chart, PromptsType.Chart],
    [BuildingBlockType.Form, PromptsType.Form],
    [BuildingBlockType.Page, PromptsType.Page],
    [BuildingBlockType.RichTextEditor, PromptsType.RichTextEditor],
    [BuildingBlockType.RichTextEditorButtonGroups, PromptsType.RichTextEditorButtonGroups]
];

/** Minimal shape of an inquirer-style prompt question returned by PromptsAPI.getPrompts. */
interface PromptQuestion {
    name?: string;
    type?: string;
    message?: unknown;
    default?: unknown;
    /** Static choices are an array of `{ value }`; dynamic choices are a function (ignored). */
    choices?: unknown;
    guiOptions?: { mandatory?: boolean };
}

const DATA_PREFIX = 'buildingBlockData.';
const METAPATH_PREFIX = 'buildingBlockData.metaPath';

const idField = zod
    .string()
    .regex(/^[A-Za-z_][\w.-]*$/, 'Must be a valid XML ID')
    .optional();

/**
 * Extracts the literal values of a question's choices when they are statically defined.
 * Dynamic choices (computed from OData metadata at prompt time) are functions, not arrays, and
 * yield `undefined` here so the caller falls back to a plain string.
 *
 * @param choices - The question's `choices` property.
 * @returns The list of literal choice values, or undefined when choices are dynamic/empty.
 */
function staticChoiceValues(choices: unknown): unknown[] | undefined {
    if (!Array.isArray(choices) || choices.length === 0) {
        return undefined;
    }
    const values = choices.map((c) =>
        c && typeof c === 'object' && 'value' in c ? (c as { value: unknown }).value : c
    );
    return values.every((v) => v !== undefined) ? values : undefined;
}

/**
 * Maps a single prompt question to a Zod type based on its prompt `type` and static choices.
 *
 * - `input` → string
 * - `list` with boolean choices → boolean; with string choices → enum; otherwise string
 * - `checkbox` with string choices → array of enum; otherwise array of string
 *
 * @param question - The prompt question.
 * @returns The Zod type for the question's value.
 */
function questionToZodType(question: PromptQuestion): zod.ZodTypeAny {
    const values = staticChoiceValues(question.choices);
    const stringValues = values?.every((v) => typeof v === 'string') ? (values as [string, ...string[]]) : undefined;

    if (question.type === 'checkbox') {
        return zod.array(stringValues ? zod.enum(stringValues) : zod.string());
    }
    if (question.type === 'list') {
        if (values?.every((v) => typeof v === 'boolean')) {
            return zod.boolean();
        }
        if (stringValues) {
            return zod.enum(stringValues);
        }
        return zod.string();
    }
    // 'input' and anything else the writer models as a free-text attribute.
    return zod.string();
}

/**
 * Converts the `buildingBlockData.*` questions returned by PromptsAPI.getPrompts into a Zod shape.
 *
 * Mapping rules:
 * - Routing questions (viewOrFragmentPath, aggregationPath, service) are skipped — they are modelled
 *   separately as top-level routing fields.
 * - `buildingBlockData.id` is skipped — modelled as the shared `id` field.
 * - Every `buildingBlockData.metaPath.*` sub-question collapses into a single flat `metaPath` string.
 *   The prompts model metaPath as a nested object ({ entitySet, qualifier, bindingContextType }), but
 *   the MCP surface — and bb_macro_api.md, translate.ts, and the emitted XML attribute — use the flat
 *   path string. generateBuildingBlock accepts both forms, so collapsing keeps one binding vocabulary.
 * - A field is required iff the prompt marks it mandatory AND has no default (a default means the
 *   writer supplies a value, so it is not required at the API surface — e.g. Page `templateType`).
 *
 * @param questions - The questions array from PromptsAPI.getPrompts.
 * @returns A Zod shape keyed by the (prefix-stripped) buildingBlockData field name.
 */
export function questionsToShape(questions: PromptQuestion[] | undefined): Record<string, zod.ZodTypeAny> {
    const shape: Record<string, zod.ZodTypeAny> = {};
    let hasMetaPath = false;

    for (const question of questions ?? []) {
        const name = typeof question.name === 'string' ? question.name : '';
        if (!name.startsWith(DATA_PREFIX) || name === 'buildingBlockData.id') {
            continue;
        }
        if (name.startsWith(METAPATH_PREFIX)) {
            hasMetaPath = true;
            continue;
        }
        const key = name.slice(DATA_PREFIX.length);
        // Defensive: any other nested (dotted) field is not part of the flat MCP surface.
        if (key.includes('.')) {
            continue;
        }
        let type = questionToZodType(question);
        if (typeof question.message === 'string') {
            type = type.describe(question.message);
        }
        const required = question.guiOptions?.mandatory === true && question.default === undefined;
        shape[key] = required ? type : type.optional();
    }

    if (hasMetaPath) {
        shape['metaPath'] = zod
            .string()
            .optional()
            .describe(
                'Binding path as the XML metaPath attribute, e.g. "/Booking/@com.sap.vocabularies.UI.v1.LineItem#qualifier".'
            );
    }
    return shape;
}

/**
 * Builds a discriminated-union member schema for a building block type from its prompt questions.
 * Uses `zod.looseObject` so extra bb_macro_api.md attributes still pass through. No `contextPath` is
 * added — the prompts do not model it and the tool always leaves it unset.
 *
 * @param type - The building block type (the discriminant).
 * @param questions - The prompt questions for the type.
 * @returns The member schema.
 */
export function buildMemberFromQuestions(
    type: BuildingBlockType,
    questions: PromptQuestion[] | undefined
): BuildingBlockMemberSchema {
    return zod.looseObject({
        buildingBlockType: zod.literal(type),
        id: idField,
        ...questionsToShape(questions)
    });
}

/**
 * Builds the add-building-block input schema, deriving the per-type member schemas from
 * fe-fpm-writer's prompts where available and falling back to the hand-written members otherwise.
 *
 * Robustness: PromptsAPI.getPrompts reads the project manifest/metadata and can throw (e.g. Page on
 * UI5 < 1.145, or unresolved metadata). Each type is derived independently; a failure for one type
 * keeps that type's hand-written member, and a failure to initialise PromptsAPI keeps all of them.
 *
 * @param options - Project root, app id and the mem-fs editor used to read the project.
 * @param options.projectRoot - Absolute path to the project root.
 * @param options.appId - App id within the project (empty for single-app projects).
 * @param options.fs - mem-fs editor instance.
 * @returns The composed zod object schema for the functionality input.
 */
export async function buildBuildingBlockSchemaFromPrompts(options: {
    projectRoot: string;
    appId?: string;
    fs: Editor;
}): Promise<ReturnType<typeof composeBuildingBlockSchema>> {
    const members = buildHandWrittenMembers();
    try {
        const promptsApi = await PromptsAPI.init(options.projectRoot, options.appId ?? '', options.fs);
        for (const [bbType, promptsType] of BB_TYPE_TO_PROMPTS_TYPE) {
            try {
                const { questions } = await promptsApi.getPrompts(promptsType);
                members[bbType] = buildMemberFromQuestions(bbType, questions as PromptQuestion[]);
            } catch (e) {
                logger.warn(
                    `[BB] prompt-derived schema: failed for "${bbType}", using hand-written fallback: ${e instanceof Error ? e.message : String(e)}`
                );
            }
        }
    } catch (e) {
        logger.warn(
            `[BB] prompt-derived schema: PromptsAPI unavailable, using hand-written schema: ${e instanceof Error ? e.message : String(e)}`
        );
    }
    return composeBuildingBlockSchema(members);
}
