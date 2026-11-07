import * as zod from 'zod';
import { BuildingBlockType } from '@sap-ux/fe-fpm-writer';
import { buildingBlockTypeNames, aggregationParentMacroMappingNote } from './utils.js';

/** A per-type member of the building block discriminated union. */
export type BuildingBlockMemberSchema = ReturnType<typeof zod.looseObject>;

/**
 * Builds the hand-written per-type member schemas for the building block discriminated union.
 *
 * These are the baseline/fallback schemas. At runtime get-functionality-details overrides the
 * types that have fe-fpm-writer prompts with schemas derived from those prompts (see
 * prompt-derived-schema.ts); these hand-written members cover the types that have no prompts
 * (Field, CustomColumn, CustomFilterField, CustomFormField, Action) and act as the fallback when
 * prompt derivation is unavailable.
 *
 * Each member uses `zod.looseObject` so declared fields are validated but any extra property the
 * LLM sends (metaPath, contextPath, and all bb_macro_api.md-documented attributes) passes through
 * to generateBuildingBlock.
 *
 * @returns Exhaustive map of BuildingBlockType → member schema.
 */
export function buildHandWrittenMembers(): Record<BuildingBlockType, BuildingBlockMemberSchema> {
    // looseObject validates the declared fields but preserves any extra properties the LLM sends
    // (e.g. metaPath, contextPath, and all bb_macro_api.md-documented attributes).
    const baseSchema = (type: BuildingBlockType): BuildingBlockMemberSchema =>
        zod.looseObject({
            buildingBlockType: zod.literal(type),
            id: zod
                .string()
                .regex(/^[A-Za-z_][\w.-]*$/, 'Must be a valid XML ID')
                .optional(),
            metaPath: zod.string().optional(),
            contextPath: zod.string().optional()
        });

    // Overrides add required display fields for types where the LLM must always provide a label —
    // surfaced in the JSON Schema so the LLM knows to provide them.
    const customColumn = zod.looseObject({
        buildingBlockType: zod.literal(BuildingBlockType.CustomColumn),
        id: zod
            .string()
            .regex(/^[A-Za-z_][\w.-]*$/, 'Must be a valid XML ID')
            .optional(),
        metaPath: zod.string().optional(),
        contextPath: zod.string().optional(),
        header: zod.string().describe('Column header label shown in the table.')
    });
    const customFilterField = zod.looseObject({
        buildingBlockType: zod.literal(BuildingBlockType.CustomFilterField),
        id: zod
            .string()
            .regex(/^[A-Za-z_][\w.-]*$/, 'Must be a valid XML ID')
            .optional(),
        metaPath: zod.string().optional(),
        contextPath: zod.string().optional(),
        label: zod.string().describe('Label shown for the filter field.'),
        property: zod.string().describe('The entity property this filter field filters on.')
    });
    const customFormField = zod.looseObject({
        buildingBlockType: zod.literal(BuildingBlockType.CustomFormField),
        id: zod
            .string()
            .regex(/^[A-Za-z_][\w.-]*$/, 'Must be a valid XML ID')
            .optional(),
        metaPath: zod.string().optional(),
        contextPath: zod.string().optional(),
        property: zod.string().describe('The entity property path this form field displays.')
    });
    const action = zod.looseObject({
        buildingBlockType: zod.literal(BuildingBlockType.Action),
        id: zod
            .string()
            .regex(/^[A-Za-z_][\w.-]*$/, 'Must be a valid XML ID')
            .optional(),
        metaPath: zod.string().optional(),
        contextPath: zod.string().optional(),
        key: zod.string().describe('Unique key identifying the action within the table actions aggregation.'),
        text: zod.string().describe('Text displayed on the action button in the toolbar.'),
        anchor: zod.string().optional().describe('Key of an existing action to place this action relative to.'),
        placement: zod
            .enum(['Before', 'After'])
            .optional()
            .describe('Whether to place this action Before or After the anchor action.')
    });

    // Page has no metaPath/contextPath — the fe-fpm-writer Page type collects title/description/
    // templateType only. baseSchema would surface irrelevant metaPath/contextPath fields.
    const page = zod.looseObject({
        buildingBlockType: zod.literal(BuildingBlockType.Page),
        id: zod
            .string()
            .regex(/^[A-Za-z_][\w.-]*$/, 'Must be a valid XML ID')
            .optional(),
        title: zod.string().describe('Title displayed in the page header.'),
        description: zod.string().optional().describe('Optional description shown below the page title.'),
        templateType: zod
            .enum(['full', 'basic'])
            .optional()
            .describe(
                "Page template: 'basic' generates a minimal self-closing macros:Page; " +
                    "'full' generates all aggregations. Defaults to 'basic'."
            )
    });

    // A single button group entry for the RichTextEditor toolbar.
    const buttonGroupConfig = zod.looseObject({
        name: zod.string().describe("Unique identifier for the button group (e.g. 'font-style', 'clipboard')."),
        buttons: zod.string().describe('Comma-separated list of buttons to include (e.g. "bold,italic,underline").'),
        priority: zod
            .number()
            .optional()
            .describe('Display priority for ordering button groups (higher = more prominent).'),
        visible: zod.boolean().optional().describe('Whether this button group is visible in the toolbar.')
    });

    // RichTextEditorButtonGroups has no metaPath/contextPath — the fe-fpm-writer type collects
    // buttonGroups only. baseSchema would surface irrelevant metaPath/contextPath fields.
    const richTextEditorButtonGroups = zod.looseObject({
        buildingBlockType: zod.literal(BuildingBlockType.RichTextEditorButtonGroups),
        id: zod
            .string()
            .regex(/^[A-Za-z_][\w.-]*$/, 'Must be a valid XML ID')
            .optional(),
        buttonGroups: zod.array(buttonGroupConfig).describe('Button groups to add to the editor toolbar.')
    });

    // Exhaustive per-type map. `satisfies Record<BuildingBlockType, …>` forces an entry for every
    // BuildingBlockType — if @sap-ux/fe-fpm-writer adds a new type upstream, this breaks the build
    // instead of silently falling back to a bare base schema (issue #39379 AC4).
    const buildingBlockSchemaByType = {
        [BuildingBlockType.Table]: baseSchema(BuildingBlockType.Table),
        [BuildingBlockType.Chart]: baseSchema(BuildingBlockType.Chart),
        [BuildingBlockType.FilterBar]: baseSchema(BuildingBlockType.FilterBar),
        [BuildingBlockType.Field]: baseSchema(BuildingBlockType.Field),
        [BuildingBlockType.Form]: baseSchema(BuildingBlockType.Form),
        [BuildingBlockType.Page]: page,
        [BuildingBlockType.RichTextEditor]: baseSchema(BuildingBlockType.RichTextEditor),
        [BuildingBlockType.RichTextEditorButtonGroups]: richTextEditorButtonGroups,
        [BuildingBlockType.CustomFormField]: customFormField,
        [BuildingBlockType.CustomColumn]: customColumn,
        [BuildingBlockType.CustomFilterField]: customFilterField,
        [BuildingBlockType.Action]: action
    } satisfies Record<BuildingBlockType, BuildingBlockMemberSchema>;

    return buildingBlockSchemaByType;
}

/**
 * Composes the full add-building-block input schema from a map of per-type member schemas.
 *
 * Validates the routing fields (viewOrFragmentPath, aggregationPath) and a discriminated union over
 * buildingBlockType. Used both by the sync baseline (buildBuildingBlockSchema) and the async
 * prompt-derived builder, which pass different member maps.
 *
 * @param membersByType - Map of BuildingBlockType → member schema.
 * @returns The composed zod object schema for the functionality input.
 */
export function composeBuildingBlockSchema(membersByType: Record<BuildingBlockType, BuildingBlockMemberSchema>) {
    const bbTypeSchemas = Object.values(membersByType) as unknown as [
        BuildingBlockMemberSchema,
        ...BuildingBlockMemberSchema[]
    ];

    return zod.object({
        viewOrFragmentPath: zod
            .string()
            .describe('Path to the view or fragment XML file relative to the app base path.'),
        aggregationPath: zod
            .string()
            .describe(
                'XPath to the aggregation element in the view XML where the building block will be inserted. ' +
                    `For standalone types (${buildingBlockTypeNames}) use the parent container. ` +
                    `For aggregation children (${aggregationParentMacroMappingNote}) use the parent macro element.`
            ),
        buildingBlockData: zod
            .discriminatedUnion('buildingBlockType', bbTypeSchemas)
            .describe(
                'Building block configuration. Use search_docs with the buildingBlockType name to get full ' +
                    'property documentation from bb_macro_api.md before populating this object.'
            )
    });
}

/**
 * Builds the sync baseline Zod schema for the add-building-block functionality input, using the
 * hand-written per-type members. This is the module default and the fallback when prompt-derived
 * schema building is unavailable.
 *
 * @returns The composed zod object schema.
 */
export function buildBuildingBlockSchema() {
    return composeBuildingBlockSchema(buildHandWrittenMembers());
}

export type BuildingBlockInput = zod.infer<ReturnType<typeof buildBuildingBlockSchema>>;
