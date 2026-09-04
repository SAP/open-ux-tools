import * as zod from 'zod';
import { BuildingBlockType } from '@sap-ux/fe-fpm-writer';
import { FunctionalityIdSchema } from './basic.js';

/**
 * Input interface for the 'list_fiori_apps' functionality
 */
export const ListFioriAppsInputSchema = zod.object({
    /** Array of paths to search for Fiori applications */
    searchPath: zod
        .array(zod.string())
        .describe(
            'Path to search for Fiori applications (defaults to current directory). If VSCode - list of VS Code workspace folder paths(`workspace.workspaceFolders`)'
        )
});

/**
 * Input interface for the 'list_functionality' functionality
 */
export const ListFunctionalitiesInputSchema = zod.object({
    /** Path to the Fiori application */
    appPath: zod
        .string()
        .min(1)
        .describe(
            'Path to the root folder of the Fiori application (where package.json and ui5.yaml reside) if one exists or to the current directory. Path should be an absolute path.'
        )
});

/**
 * Input interface for the 'get_functionality_details' functionality
 */
export const GetFunctionalityDetailsInputSchema = zod.object({
    /** Path to the Fiori application */
    appPath: zod
        .string()
        .describe(
            'Path to the Fiori application if one exists or to the current directory. Path should be an absolute path.'
        ),
    /** ID or array of IDs of the functionality(ies) */
    functionalityId: FunctionalityIdSchema.describe('The ID of the functionality to get details for')
});

/**
 * Input interface for the 'execute_functionality' functionality
 */
export const ExecuteFunctionalityInputSchema = zod
    .object({
        /** ID or array of IDs of the functionality(ies) to execute */
        functionalityId: FunctionalityIdSchema.describe('The ID of the functionality to execute'),
        /** Parameters for the functionality execution */
        parameters: zod.record(zod.string(), zod.unknown()).describe('Parameters for the functionality execution'),
        /** Path to the Fiori application */
        appPath: zod
            .string()
            .describe(
                'Path to the Fiori application if one exists or to the current directory. Path should be an absolute path.'
            )
    })
    .describe(
        'Input object for executing a functionality. ' +
            'Only three top-level properties are allowed: "functionalityId", "parameters", and "appPath". ' +
            'All other dynamic or functionality-specific inputs must be included inside the "parameters" object. ' +
            'Do not place any additional fields at the root level.'
    );

export const DownloadODataServiceMetadataInputSchema = zod.object({
    sapSystemQuery: zod
        .string()
        .optional()
        .describe('The name, host or a URL of the SAP system to fetch service metadata from.'),
    servicePath: zod
        .string()
        .optional()
        .describe(
            'The path to the SAP service to fetch metadata for. ' +
                'ONLY use this if the user provides an EXACT path (e.g., "/sap/opu/odata/sap/ZUI_TRAVEL_O4/"). ' +
                'DO NOT construct paths from service names. This parameter is required.'
        ),
    /* serviceName: zod
        .string()
        .optional()
        .describe(
            '✅ USE THIS for service names! ' +
                'The technical name of the OData service.' +
                'If the user provides just a service name (not a full path containing forward slashes), pass it here. ' +
                'A catalog lookup will be performed to resolve the service path automatically. ' +
                'DO NOT try to construct servicePath yourself - let the tool do the lookup.'
        ), */
    appPath: zod
        .string()
        .describe('Absolute path to the folder where metadata.xml will be saved. Typically the project target folder.')
});

export const DocSearchInputSchema = zod.object({
    query: zod
        .string()
        .min(2)
        .describe('The search query for fiori elements, annotations, sapui5, fiori tools documentation')
});

/**
 * Fragment configuration for custom building blocks (custom-column, custom-filter-field, custom-form-field).
 * The agent should inspect the webapp directory to find an appropriate fragment name and folder.
 * The namespace (ns) is derived automatically from the app's manifest.json.
 * Required for the companion .fragment.xml file to be generated — omitting it will leave the view
 * referencing a fragment that does not exist on disk.
 */
const EmbededFragmentSchema = zod
    .object({
        name: zod.string().describe('Fragment file name without extension, e.g. "CustomColumn". Used to generate <appNs>.<folder>.<name>.fragment.xml.'),
        folder: zod
            .string()
            .optional()
            .describe('Target folder relative to the app root, e.g. "ext/fragment". Defaults to "ext/<id>" when omitted.')
    })
    .describe(
        'Required for the companion .fragment.xml file to be generated. ' +
            'Inspect webapp/ (list_fiori_apps + read directory) to find existing fragments or choose a name. ' +
            'The app namespace is derived from manifest.json automatically.'
    );

/** Shared base fields present on every building block type. */
const BuildingBlockBaseSchema = zod.object({
    id: zod.string().min(1).describe('ID for the inserted building block XML element.'),
    metaPath: zod
        .string()
        .optional()
        .describe(
            'Relative annotation path for data binding, e.g. "@com.sap.vocabularies.UI.v1.LineItem". Use search_docs if unsure which annotation to use.'
        ),
    contextPath: zod
        .string()
        .optional()
        .describe('Absolute entity set path providing the binding context, e.g. "/SalesOrder".')
});

/**
 * Per-type building block schemas derived from @sap-ux/fe-fpm-writer types.
 * Each discriminant value matches BuildingBlockType in fe-fpm-writer/src/building-block/types.ts.
 */
const TableBuildingBlockSchema = BuildingBlockBaseSchema.extend({
    buildingBlockType: zod.literal(BuildingBlockType.Table),
    filterBar: zod.string().optional().describe('ID of the FilterBar building block to associate with this table.'),
    personalization: zod
        .union([zod.boolean(), zod.enum(['Sort', 'Column', 'Filter'])])
        .optional()
        .describe('Personalization options: true (all), false (none), or "Sort", "Column", "Filter".'),
    selectionMode: zod
        .enum(['None', 'Single', 'Multi', 'Auto'])
        .optional()
        .describe('Row selection mode for the table.'),
    type: zod
        .enum(['GridTable', 'ResponsiveTable'])
        .optional()
        .describe('Table rendering type. Defaults to ResponsiveTable.'),
    header: zod.string().optional().describe('Header text shown above the table.'),
    headerVisible: zod.boolean().optional().describe('Whether the header text is visible.'),
    busy: zod.boolean().optional().describe('Expression to control the busy state of the table.'),
    enableAutoColumnWidth: zod.boolean().optional().describe('Automatically adjust column widths.'),
    enableExport: zod.boolean().optional().describe('Enable spreadsheet export. Defaults to true.'),
    enableFullScreen: zod.boolean().optional().describe('Enable full-screen mode toggle.'),
    enablePaste: zod.boolean().optional().describe('Enable paste from clipboard.'),
    isSearchable: zod.boolean().optional().describe('Show the search action in the toolbar.'),
    readOnly: zod.boolean().optional().describe('Set the table to read-only mode.'),
    variantManagement: zod.string().optional().describe('Variant management mode: "Page", "Control", or "None".')
});

const ChartBuildingBlockSchema = BuildingBlockBaseSchema.extend({
    buildingBlockType: zod.literal(BuildingBlockType.Chart),
    filterBar: zod.string().optional().describe('ID of the FilterBar building block to associate with this chart.'),
    personalization: zod
        .union([zod.boolean(), zod.string()])
        .optional()
        .describe('Enable chart personalization options.'),
    selectionMode: zod.string().optional().describe('Selection mode for the chart.'),
    selectionChange: zod.string().optional().describe('Event handler for selection changes.')
});

const FilterBarBuildingBlockSchema = BuildingBlockBaseSchema.extend({
    buildingBlockType: zod.literal(BuildingBlockType.FilterBar),
    liveMode: zod
        .boolean()
        .optional()
        .describe('Trigger search automatically when a filter value changes. Defaults to false.'),
    showClearButton: zod.boolean().optional().describe('Show the Clear button on the FilterBar. Defaults to false.'),
    showMessages: zod
        .boolean()
        .optional()
        .describe('Display search errors in a message box. Defaults to true.'),
    filterChanged: zod.string().optional().describe('Event handler fired when a filter value or visibility changes.'),
    search: zod.string().optional().describe('Event handler fired when Go is pressed or a condition changes.')
});

/** Format options for a Field building block, controlling display of value/description/text. */
const FieldFormatOptionsSchema = zod
    .object({
        displayMode: zod
            .enum(['Value', 'Description', 'ValueDescription', 'DescriptionValue'])
            .optional()
            .describe('How the field value and associated text are displayed together.'),
        measureDisplayMode: zod
            .enum(['Hidden', 'ReadOnly'])
            .optional()
            .describe('Whether the field measure is hidden or read-only.'),
        textExpandBehaviorDisplay: zod
            .enum(['InPlace', 'Popover'])
            .optional()
            .describe('How the full text is displayed: inline or in a popover.'),
        textLinesEdit: zod.number().optional().describe('Maximum number of lines for multiline texts in edit mode.'),
        textMaxCharactersDisplay: zod
            .number()
            .optional()
            .describe('Maximum number of characters shown initially in display mode.'),
        textMaxLines: zod.number().optional().describe('Maximum lines that multiline texts in edit mode can grow to.')
    })
    .optional()
    .describe('Format options controlling how the field value is rendered.');

const FieldBuildingBlockSchema = BuildingBlockBaseSchema.extend({
    buildingBlockType: zod.literal(BuildingBlockType.Field),
    readOnly: zod.boolean().optional().describe('Set the field to read-only mode.'),
    formatOptions: FieldFormatOptionsSchema,
    semanticObject: zod.string().optional().describe('Semantic object(s) for navigation.')
});

const FormBuildingBlockSchema = BuildingBlockBaseSchema.extend({
    buildingBlockType: zod.literal(BuildingBlockType.Form),
    title: zod.string().describe('Title shown above the form.')
});

const PageBuildingBlockSchema = BuildingBlockBaseSchema.extend({
    buildingBlockType: zod.literal(BuildingBlockType.Page),
    title: zod.string().optional().describe('Page title.'),
    description: zod.string().optional().describe('Page description.'),
    templateType: zod
        .enum(['full', 'basic'])
        .optional()
        .describe('"full" generates all aggregations; "basic" generates a minimal self-closing element.')
});

const RichTextEditorBuildingBlockSchema = BuildingBlockBaseSchema.extend({
    buildingBlockType: zod.literal(BuildingBlockType.RichTextEditor),
    targetProperty: zod
        .string()
        .optional()
        .describe('Property path for the Rich Text Editor, e.g. "/EntitySet/targetProperty".'),
    buttonGroups: zod
        .array(
            zod.object({
                name: zod.string().describe('Unique identifier for the button group, e.g. "font-style", "clipboard".'),
                buttons: zod.string().describe('Comma-separated list of buttons, e.g. "bold,italic,underline".'),
                priority: zod.number().optional().describe('Display priority for ordering button groups. Defaults to 10.')
            })
        )
        .optional()
        .describe('Button groups to include in the editor toolbar.')
});

const RichTextEditorButtonGroupsBuildingBlockSchema = BuildingBlockBaseSchema.extend({
    buildingBlockType: zod.literal(BuildingBlockType.RichTextEditorButtonGroups),
    buttonGroups: zod
        .array(
            zod.object({
                name: zod.string().describe('Unique identifier for the button group, e.g. "font-style", "clipboard".'),
                buttons: zod.string().describe('Comma-separated list of buttons, e.g. "bold,italic,underline".'),
                priority: zod.number().optional().describe('Display priority for ordering button groups. Defaults to 10.'),
                visible: zod.boolean().optional().describe('Whether this button group is visible. Defaults to true.'),
                customToolbarPriority: zod.number().optional().describe('Custom toolbar priority to override default positioning.'),
                row: zod.number().optional().describe('Row number in the toolbar where this button group appears.'),
                id: zod.string().optional().describe('Optional ID for the button group.')
            })
        )
        .optional()
        .describe('Button groups to configure in the rich text editor toolbar.')
});

const CustomFilterFieldBuildingBlockSchema = BuildingBlockBaseSchema.extend({
    buildingBlockType: zod.literal(BuildingBlockType.CustomFilterField),
    anchor: zod.string().describe('Key of another filter to position this one relative to.'),
    label: zod.string().describe('Display text for this filter field.'),
    property: zod.string().describe('The property to filter by.'),
    required: zod.boolean().describe('Whether the filter field is required.'),
    filterFieldKey: zod.string().optional().describe('Property name of the FilterField.'),
    position: zod
        .object({
            anchor: zod.string().optional().describe('Key of an existing filter to position relative to.'),
            placement: zod.enum(['Before', 'After']).optional().describe('Whether to place before or after the anchor.')
        })
        .optional()
        .describe('Position of this filter field relative to an existing one.'),
    embededFragment: EmbededFragmentSchema
});

const CustomFormFieldBuildingBlockSchema = BuildingBlockBaseSchema.extend({
    buildingBlockType: zod.literal(BuildingBlockType.CustomFormField),
    label: zod.string().describe('Label text for this form field.'),
    formElementKey: zod.string().optional().describe('Optional key for the FormElement.'),
    position: zod
        .object({
            anchor: zod.string().optional().describe('Key of another field to position this one relative to.'),
            placement: zod.enum(['Before', 'After']).optional().describe('Position relative to the anchor.')
        })
        .optional()
        .describe('Position of the custom form field relative to an anchor element.'),
    targetProperty: zod.string().optional().describe('Property path for the custom form field.'),
    embededFragment: EmbededFragmentSchema
});

const CustomColumnBuildingBlockSchema = BuildingBlockBaseSchema.extend({
    buildingBlockType: zod.literal(BuildingBlockType.CustomColumn),
    title: zod.string().describe('Column header text.'),
    width: zod.string().optional().describe('Column width, e.g. "10rem".'),
    columnKey: zod.string().optional().describe('Unique key for the column.'),
    position: zod
        .object({
            anchor: zod.string().optional().describe('Key of an existing column to position relative to.'),
            placement: zod.enum(['Before', 'After']).optional().describe('Whether to place before or after the anchor.')
        })
        .optional()
        .describe('Position of this column relative to an existing one.'),
    embededFragment: EmbededFragmentSchema
});

const ActionBuildingBlockSchema = BuildingBlockBaseSchema.extend({
    buildingBlockType: zod.literal(BuildingBlockType.Action),
    actionKey: zod.string().describe('Unique identifier for the action.'),
    text: zod.string().describe('Display text for the action button.'),
    anchor: zod.string().optional().describe('Key of another action to position this one relative to.'),
    placement: zod.enum(['Before', 'After']).optional().describe('Position relative to the anchor action.'),
    requiresSelection: zod.boolean().optional().describe('Whether a row selection is required. Defaults to false.'),
    embeddedAction: zod
        .object({
            eventHandler: zod
                .object({
                    fileName: zod.string().optional().describe('Controller file name to require, e.g. "project1.ext.controller.Main".'),
                    fnName: zod.string().optional().describe('Handler function name, e.g. ".onApprove". Defaults to "onPress".')
                })
                .optional()
                .describe('Event handler wired to the action press event.')
        })
        .optional()
        .describe('Embedded action configuration for linking a press handler to the action button.')
});

/** Discriminated union of all supported building block types. */
const BuildingBlockDataSchema = zod.discriminatedUnion('buildingBlockType', [
    TableBuildingBlockSchema,
    ChartBuildingBlockSchema,
    FilterBarBuildingBlockSchema,
    FieldBuildingBlockSchema,
    FormBuildingBlockSchema,
    PageBuildingBlockSchema,
    RichTextEditorBuildingBlockSchema,
    RichTextEditorButtonGroupsBuildingBlockSchema,
    CustomFilterFieldBuildingBlockSchema,
    CustomFormFieldBuildingBlockSchema,
    CustomColumnBuildingBlockSchema,
    ActionBuildingBlockSchema
]);

/**
 * Input interface for the 'add_building_block' tool
 */
export const AddBuildingBlockInputSchema = zod.object({
    /** Absolute path to the Fiori app root (where manifest.json lives) */
    appPath: zod
        .string()
        .min(1)
        .describe('Absolute path to the Fiori app root directory (where manifest.json lives).'),
    /** Relative path to the target view or fragment XML file */
    viewOrFragmentPath: zod
        .string()
        .min(1)
        .describe(
            'Relative path from appPath to the view or fragment XML file where the building block will be inserted, e.g. "webapp/ext/main/Main.view.xml".'
        ),
    /** XPath to the aggregation element where the building block will be inserted */
    aggregationPath: zod
        .string()
        .min(1)
        .describe(
            'XPath expression pointing to the aggregation element in the view/fragment where the building block is inserted, e.g. "/mvc:View/content".'
        ),
    /** Building block configuration — shape varies by buildingBlockType */
    buildingBlockData: BuildingBlockDataSchema.describe(
        'Configuration for the building block. Required: buildingBlockType, id. Optional: metaPath, contextPath, and type-specific properties.'
    )
});
