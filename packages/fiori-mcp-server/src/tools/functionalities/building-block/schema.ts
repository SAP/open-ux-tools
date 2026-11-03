import * as zod from 'zod';
import { BuildingBlockType } from '@sap-ux/fe-fpm-writer';
import { buildingBlockTypeNames, aggregationParentMacroMappingNote } from './utils.js';

/** A per-type member of the building block discriminated union. */
type BuildingBlockMemberSchema = ReturnType<typeof zod.looseObject>;

/**
 * Builds the Zod schema for the add-building-block functionality input.
 *
 * The schema validates routing fields (viewOrFragmentPath, aggregationPath, buildingBlockType)
 * and passes through all other buildingBlockData properties to generateBuildingBlock via
 * `zod.looseObject`. Full property semantics live in bb_macro_api.md — the LLM is told to fetch
 * them with search_docs rather than duplicating them as inline Zod descriptions here.
 */
export function buildBuildingBlockSchema() {
    // looseObject validates the declared fields but preserves any extra properties the LLM sends
    // (e.g. metaPath, contextPath, and all bb_macro_api.md-documented attributes).
    const baseSchema = (type: BuildingBlockType): BuildingBlockMemberSchema =>
        zod.looseObject({
            buildingBlockType: zod.literal(type),
            id: zod.string().optional(),
            metaPath: zod.string().optional(),
            contextPath: zod.string().optional()
        });

    // Overrides add required display fields for types where the LLM must always provide a label —
    // surfaced in the JSON Schema so the LLM knows to provide them.
    const customColumn = zod.looseObject({
        buildingBlockType: zod.literal(BuildingBlockType.CustomColumn),
        id: zod.string().optional(),
        metaPath: zod.string().optional(),
        contextPath: zod.string().optional(),
        header: zod.string().describe('Column header label shown in the table.')
    });
    const customFilterField = zod.looseObject({
        buildingBlockType: zod.literal(BuildingBlockType.CustomFilterField),
        id: zod.string().optional(),
        metaPath: zod.string().optional(),
        contextPath: zod.string().optional(),
        label: zod.string().describe('Label shown for the filter field.'),
        property: zod.string().describe('The entity property this filter field filters on.')
    });
    const action = zod.looseObject({
        buildingBlockType: zod.literal(BuildingBlockType.Action),
        id: zod.string().optional(),
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
        [BuildingBlockType.CustomFormField]: baseSchema(BuildingBlockType.CustomFormField),
        [BuildingBlockType.CustomColumn]: customColumn,
        [BuildingBlockType.CustomFilterField]: customFilterField,
        [BuildingBlockType.Action]: action
    } satisfies Record<BuildingBlockType, BuildingBlockMemberSchema>;

    const bbTypeSchemas = Object.values(buildingBlockSchemaByType) as unknown as [
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
