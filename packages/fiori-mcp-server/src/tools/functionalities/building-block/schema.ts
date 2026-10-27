import * as zod from 'zod';
import { BuildingBlockType } from '@sap-ux/fe-fpm-writer';
import { buildingBlockTypeNames, aggregationParentMacroMappingNote } from './utils.js';

/**
 * Builds the Zod schema for the add-building-block MCP tool input.
 *
 * The schema validates routing fields (viewOrFragmentPath, aggregationPath, buildingBlockType)
 * and passes through all other buildingBlockData properties to generateBuildingBlock.
 * Full property semantics are in bb_macro_api.md — use search_docs to retrieve them.
 */
export function buildBuildingBlockSchema() {
    // it validates declared fields but preserves any extra properties the LLM sends
    // (e.g. metaPath, contextPath, and all bb_macro_api.md-documented attributes).
    const baseSchema = (type: BuildingBlockType) =>
        zod.looseObject({
            buildingBlockType: zod.literal(type),
            id: zod.string().optional(),
            metaPath: zod.string().optional(),
            contextPath: zod.string().optional()
        });

    // Overrides add required display fields for types where the LLM must always
    // provide a label — surfaced in the JSON Schema so the LLM knows to provide them.
    const overrides: Partial<Record<BuildingBlockType, ReturnType<typeof zod.looseObject>>> = {
        [BuildingBlockType.CustomColumn]: zod.looseObject({
            buildingBlockType: zod.literal(BuildingBlockType.CustomColumn),
            id: zod.string().optional(),
            metaPath: zod.string().optional(),
            contextPath: zod.string().optional(),
            header: zod.string().describe('Column header label shown in the table.')
        }),
        [BuildingBlockType.CustomFilterField]: zod.looseObject({
            buildingBlockType: zod.literal(BuildingBlockType.CustomFilterField),
            id: zod.string().optional(),
            metaPath: zod.string().optional(),
            contextPath: zod.string().optional(),
            label: zod.string().describe('Label shown for the filter field.'),
            property: zod.string().describe('The entity property this filter field filters on.')
        }),
        [BuildingBlockType.Action]: zod.looseObject({
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
        })
    };

    const bbTypeSchemas = Object.values(BuildingBlockType).map(
        (type) => overrides[type] ?? baseSchema(type)
    ) as unknown as [ReturnType<typeof zod.looseObject>, ...ReturnType<typeof zod.looseObject>[]];

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
                'Building block configuration. Use search_docs with the buildingBlockType name to get full property documentation from bb_macro_api.md before populating this object.'
            )
    });
}

export type BuildingBlockInput = zod.infer<ReturnType<typeof buildBuildingBlockSchema>>;
