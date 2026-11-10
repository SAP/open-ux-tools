import * as zod from 'zod';
import { BuildingBlockType } from '@sap-ux/fe-fpm-writer';
import { buildingBlockTypeNames, aggregationParentMacroMappingNote } from './utils.js';

/** A per-type member of the building block discriminated union. */
export type BuildingBlockMemberSchema = ReturnType<typeof zod.looseObject>;

/** Regex-validated optional XML id, shared by every member. */
const idField = zod
    .string()
    .regex(/^[A-Za-z_][\w.-]*$/, 'Must be a valid XML ID')
    .optional();

/**
 * Builds the per-type member schemas for the building block discriminated union.
 *
 * The schema is intentionally lean: each member validates only the discriminant (`buildingBlockType`)
 * and the optional `id`, and uses `zod.looseObject` so every other property the LLM sends
 * (`metaPath`, `title`, `buttonGroups`, and all other bb_macro_api.md-documented attributes) passes
 * straight through to generateBuildingBlock. Full property semantics live in bb_macro_api.md and are
 * fetched via `search_docs` — they are deliberately not duplicated here.
 *
 * No member declares `metaPath` or `contextPath`: nothing should advertise `contextPath` (the tool
 * always leaves it unset), and advertising `metaPath` only on some types caused Page /
 * RichTextEditorButtonGroups to surface fields they do not use. The only extra declared fields are the
 * handful the LLM must always provide for the aggregation children + Action, kept so the schema fails
 * fast instead of letting generateBuildingBlock produce bad output.
 *
 * @returns Exhaustive map of BuildingBlockType → member schema.
 */
export function buildBuildingBlockMembers(): Record<BuildingBlockType, BuildingBlockMemberSchema> {
    const baseSchema = (type: BuildingBlockType): BuildingBlockMemberSchema =>
        zod.looseObject({
            buildingBlockType: zod.literal(type),
            id: idField
        });

    // Overrides declare the fields the LLM must always provide (surfaced in the JSON schema so they
    // are required). Everything else still flows through via looseObject.
    const customColumn = zod.looseObject({
        buildingBlockType: zod.literal(BuildingBlockType.CustomColumn),
        id: idField,
        header: zod.string().describe('Column header label shown in the table.')
    });
    const customFilterField = zod.looseObject({
        buildingBlockType: zod.literal(BuildingBlockType.CustomFilterField),
        id: idField,
        label: zod.string().describe('Label shown for the filter field.'),
        property: zod.string().describe('The entity property this filter field filters on.')
    });
    const customFormField = zod.looseObject({
        buildingBlockType: zod.literal(BuildingBlockType.CustomFormField),
        id: idField,
        property: zod.string().describe('The entity property path this form field displays.')
    });
    const action = zod.looseObject({
        buildingBlockType: zod.literal(BuildingBlockType.Action),
        id: idField,
        key: zod.string().describe('Unique key identifying the action within the table actions aggregation.'),
        text: zod.string().describe('Text displayed on the action button in the toolbar.'),
        anchor: zod.string().optional().describe('Key of an existing action to place this action relative to.'),
        placement: zod
            .enum(['Before', 'After'])
            .optional()
            .describe('Whether to place this action Before or After the anchor action.')
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
        [BuildingBlockType.Page]: baseSchema(BuildingBlockType.Page),
        [BuildingBlockType.RichTextEditor]: baseSchema(BuildingBlockType.RichTextEditor),
        [BuildingBlockType.RichTextEditorButtonGroups]: baseSchema(BuildingBlockType.RichTextEditorButtonGroups),
        [BuildingBlockType.CustomFormField]: customFormField,
        [BuildingBlockType.CustomColumn]: customColumn,
        [BuildingBlockType.CustomFilterField]: customFilterField,
        [BuildingBlockType.Action]: action
    } satisfies Record<BuildingBlockType, BuildingBlockMemberSchema>;

    return buildingBlockSchemaByType;
}

/**
 * Builds the Zod schema for the add-building-block functionality input: the routing fields
 * (viewOrFragmentPath, aggregationPath) plus a discriminated union over buildingBlockType. Property
 * semantics are documented in bb_macro_api.md and fetched via `search_docs` rather than declared here.
 *
 * @returns The composed zod object schema.
 */
export function buildBuildingBlockSchema() {
    const bbTypeSchemas = Object.values(buildBuildingBlockMembers()) as unknown as [
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

export type BuildingBlockInput = zod.infer<ReturnType<typeof buildBuildingBlockSchema>>;
