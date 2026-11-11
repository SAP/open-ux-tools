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
 * The schema is intentionally as lean as possible: every member validates ONLY the discriminant
 * (`buildingBlockType`) and the optional `id`, and uses `zod.looseObject` so every other property the LLM
 * sends (`metaPath`, `title`, `header`, `key`, `buttonGroups`, and all other bb_macro_api.md-documented
 * attributes) passes straight through to generateBuildingBlock. All property semantics — including which
 * fields are required for which type — live in bb_macro_api.md and are fetched via `search_docs`; they are
 * deliberately NOT duplicated or overridden here (no per-type field overrides, no partial field configs).
 *
 * No member declares `metaPath` or `contextPath`: nothing should advertise `contextPath` (the tool always
 * leaves it unset), and advertising `metaPath` only on some types surfaced fields they do not use.
 *
 * @returns Exhaustive map of BuildingBlockType → member schema.
 */
export function buildBuildingBlockMembers(): Record<BuildingBlockType, BuildingBlockMemberSchema> {
    const baseSchema = (type: BuildingBlockType): BuildingBlockMemberSchema =>
        zod.looseObject({
            buildingBlockType: zod.literal(type),
            id: idField
        });

    // Exhaustive per-type map. Every type uses the same lean base — property semantics come from
    // `search_docs`, not the schema. `satisfies Record<BuildingBlockType, …>` forces an entry for every
    // BuildingBlockType — if @sap-ux/fe-fpm-writer adds a new type upstream, this breaks the build instead
    // of silently omitting it (issue #39379 AC4).
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
        [BuildingBlockType.CustomColumn]: baseSchema(BuildingBlockType.CustomColumn),
        [BuildingBlockType.CustomFilterField]: baseSchema(BuildingBlockType.CustomFilterField),
        [BuildingBlockType.Action]: baseSchema(BuildingBlockType.Action)
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
