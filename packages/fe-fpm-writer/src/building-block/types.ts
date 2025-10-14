import type { CustomElement, CustomFragment, EventHandler, FragmentContentData, Position } from '../common/types';

/**
 * Building block type.
 *
 * @enum {string}
 */
export enum BuildingBlockType {
    FilterBar = 'filter-bar',
    Chart = 'chart',
    Field = 'field',
    Page = 'page',
    Table = 'table',
    CustomColumn = 'custom-column',
    RichTextEditor = 'rich-text-editor'
}

/**
 * Binding context type.
 * Dictates where to search for annotation path qualifiers.
 * absolute - gets annotation path qualifiers in entity.
 * relative - gets annotation path qualifiers in navigation path 1 level deep.
 */
export type BindingContextType = 'absolute' | 'relative';
export const bindingContextAbsolute: BindingContextType = 'absolute';
export const bindingContextRelative: BindingContextType = 'relative';

export type TemplateConfig = {
    hasAggregation?: boolean;
    aggregationNamespace: string;
};

/**
 * Represents a building block metaPath object.
 */
export interface BuildingBlockMetaPath {
    entitySet: string;
    qualifier?: string;
    bindingContextType?: BindingContextType;
    /**
     * Always generate absolute paths.
     *
     * @default true
     */
    alwaysAbsolutePath?: boolean;
}

/**
 * Represents a building block control.
 */
export interface BuildingBlock {
    /**
     * Building block type.
     */
    buildingBlockType: BuildingBlockType;

    /**
     * Defines the path of the context used in the current page or block. This setting is defined by the framework.
     */
    contextPath?: string;

    /**
     * ID of the building block.
     */
    id: string;

    /**
     * Defines the relative path of the property in the metamodel, based on the current contextPath.
     */
    metaPath?: string | BuildingBlockMetaPath;
}

/**
 * Represents a Chart building block control.
 * Usually, a contextPath and metaPath is expected.
 *
 * @example
 * <macro:Chart id="MyChart" contextPath="/RootEntity" metaPath="@com.sap.vocabularies.UI.v1.Chart" />
 * @extends {BuildingBlock}
 */
export interface Chart extends BuildingBlock {
    /**
     * ID of the FilterBar building block associated with the chart.
     */
    filterBar?: string;
    /**
     * Sets the personalization of the chart
     */
    personalization?: boolean | string;
    /**
     * Specifies the selection mode.
     */
    selectionMode?: string;
    /**
     * An event triggered when chart selections are changed.
     * The event contains information about the data selected/deselected and the Boolean flag that indicates
     * whether data is selected or deselected.
     */
    selectionChange?: string;
}

/**
 * Represents a custom filter to be used inside the FilterBar.
 * The template for the FilterField has to be provided as the default aggregation.
 */
export interface FilterField {
    /**
     * Reference to the key of another filter already displayed in the table to properly place this one.
     */
    anchor: string;
    /**
     * The property name of the FilterField.
     */
    key: string;
    /**
     * The text that will be displayed for this FilterField.
     */
    label: string;
    /**
     * If set the search will be automatically triggered, when a filter value was changed.
     */
    liveMode: boolean;
    /**
     * Defines where this filter should be placed relative to the defined anchor.
     * Allowed values are `Before` and `After`.
     */
    placement: 'Before' | 'After';
    /**
     * Parameter which sets the visibility of the FilterBar building block.
     */
    visible: boolean;
}

/**
 * Represents a Filter Bar building block control.
 * Usually, a SelectionFields annotation is expected.
 *
 * @example
 * <macro:FilterBar id="MyFilterBar" metaPath="@com.sap.vocabularies.UI.v1.SelectionFields" />
 * @extends {BuildingBlock}
 */
export interface FilterBar extends BuildingBlock {
    /**
     * This event is fired after either a filter value or the visibility of a filter item has been changed.
     * The event contains conditions that will be used as filters.
     */
    filterChanged?: string;
    /**
     * This event is fired when the Go button is pressed or after a condition change.
     */
    search?: string;
    /**
     * If true, the search is triggered automatically when a filter value is changed.
     *
     * @default false
     */
    liveMode?: boolean;
    /**
     * Handles the visibility of the 'Clear' button on the FilterBar.
     *
     * @default false
     */
    showClearButton?: boolean;
    /**
     * Displays possible errors during the search in a message box.
     *
     * @default true
     */
    showMessages?: boolean;
}

/**
 * Represents the format options for a field control.
 */
export interface FieldFormatOptions {
    /**
     * Defines how the field value and associated text will be displayed together.
     * Allowed values are "Value", "Description", "ValueDescription" and "DescriptionValue"
     */
    displayMode?: 'Value' | 'Description' | 'ValueDescription' | 'DescriptionValue';
    /**
     * Defines if and how the field measure will be displayed.
     * Allowed values are "Hidden" and "ReadOnly"
     */
    measureDisplayMode?: 'Hidden' | 'ReadOnly';
    /**
     * Defines how the full text will be displayed.
     * Allowed values are "InPlace" and "Popover"
     */
    textExpandBehaviorDisplay?: 'InPlace' | 'Popover';
    /**
     * Maximum number of lines for multiline texts in edit mode.
     */
    textLinesEdit?: number;
    /**
     * Maximum number of characters from the beginning of the text field that are shown initially.
     */
    textMaxCharactersDisplay?: number;
    /**
     * Maximum number of lines that multiline texts in edit mode can grow to.
     */
    textMaxLines?: number;
}

/**
 * Building block for creating a field based on the metadata provided by OData V4.
 * Usually, a DataField or DataPoint annotation is expected, but the field can also be used to display
 * a property from the entity type.
 *
 * @example
 * <macro:Field id="MyField" metaPath="MyProperty" />
 * @extends {BuildingBlock}
 */
export interface Field extends BuildingBlock {
    /**
     * A set of format options that can be configured.
     */
    formatOptions?: FieldFormatOptions;
    /**
     * An expression that allows you to control the read-only state of the field.
     * If you do not set any expression, SAP Fiori elements hooks into the standard lifecycle
     * to determine the current state.
     */
    readOnly?: boolean;
    /**
     * Option to add semantic objects to a field.
     * Valid options are either a single semantic object, a stringified array of semantic objects
     * or a single binding expression returning either a single semantic object or an array of semantic objects
     */
    semanticObject?: string;
}

/**
 * Building block for creating a Form based on the metadata provided by OData V4.
 * It is designed to work based on a FieldGroup annotation but can also work if you provide a
 * ReferenceFacet or a CollectionFacet.
 *
 * @example
 * <macro:Form id="MyForm" metaPath="@com.sap.vocabularies.UI.v1.FieldGroup#GeneralInformation" />
 * @extends {BuildingBlock}
 */
export interface Form extends BuildingBlock {
    /**
     * The title of the form control.
     */
    title?: string;
}

/**
 * Building block used to create a form element containing a label and a field.
 *
 * @extends {BuildingBlock}
 */
export interface FormElement extends BuildingBlock {
    /**
     * Label shown for the field. If not set, the label from the annotations will be shown.
     */
    label: string;
    /**
     * If set to false, the FormElement is not rendered.
     */
    visible: boolean;
}

/**
 * Building block used to create a micro chart based on the metadata provided by OData V4.
 *
 * @extends {BuildingBlock}
 */
export interface MicroChart extends BuildingBlock {
    /**
     * Batch group ID along with which this call should be grouped.
     */
    batchGroupId?: string;
    /**
     * Show blank space in case there is no data in the chart.
     */
    hideOnNoData?: boolean;
    /**
     * To control the rendering of Title, Subtitle and Currency Labels. When the size is xs then we do not see
     * the inner labels of the micro chart as well.
     */
    showOnlyChart?: boolean;
    /**
     * Size of the micro chart control.
     */
    size?: string;
}

/**
 * Building block used to create a paginator control.
 *
 * @example
 * <macro:Paginator id="someID" />
 * @extends {BuildingBlock}
 */
export type Paginator = BuildingBlock;

/**
 * Building block used to create the share functionality.
 * Please note that the 'Share in SAP Jam' option is only available on platforms that are integrated with SAP Jam.
 * If you are consuming this macro in an environment where the SAP Fiori launchpad is not available,
 * then the 'Save as Tile' option is not visible.
 *
 * @example
 * <macro:Share id="someID" visible="true" />
 * @extends {BuildingBlock}
 */
export interface Share extends BuildingBlock {
    /**
     * If set to false, the share control is not rendered.
     */
    visible: boolean;
}

/**
 * Building block used to create a table based on the metadata provided by OData V4.
 * Usually, a LineItem or PresentationVariant annotation is expected,
 * but the table building block can also be used to display an EntitySet.
 *
 * @example
 * <macro:Table id="MyTable" metaPath="@com.sap.vocabularies.UI.v1.LineItem" />
 * @extends {BuildingBlock}
 */
export interface Table extends BuildingBlock {
    /**
     * An expression that allows you to control the 'busy' state of the table.
     */
    busy?: boolean;
    /**
     * Specifies the header text that is shown in the table.
     */
    enableAutoColumnWidth?: boolean;
    /**
     * Controls if the export functionality of the table is enabled or not.
     * Default value is true.
     */
    enableExport?: boolean;
    /**
     * Controls whether the table can be opened in fullscreen mode or not.
     */
    enableFullScreen?: boolean;
    /**
     * Controls if the paste functionality of the table is enabled or not.
     */
    enablePaste?: boolean;
    /**
     * ID of the FilterBar building block associated with the table.
     */
    filterBar?: string;
    /**
     * Specifies the header text that is shown in the table.
     */
    header?: string;
    /**
     * Controls if the header text should be shown or not.
     * Default value is true.
     */
    headerVisible?: boolean;
    /**
     * Defines whether to display the search action.
     */
    isSearchable?: boolean;
    /**
     * Controls which options should be enabled for the table personalization dialog.
     * If it is set to `true`, all possible options for this kind of table are enabled.
     * If it is set to `false`, personalization is disabled.
     * You can also provide a more granular control for the personalization by providing a comma-separated list
     * with the options you want to be available.
     * Available options are: `Sort`, `Column` and `Filter`
     */
    personalization?: boolean | 'Sort' | 'Column' | 'Filter';
    /**
     * An expression that allows you to control the 'read-only' state of the table.
     * If you do not set any expression, SAP Fiori elements hooks into the standard lifecycle to determine
     * the current state.
     */
    readOnly?: boolean;
    /**
     * Defines the selection mode to be used by the table.
     * Allowed values are `None`, `Single`, `Multi` or `Auto`
     */
    selectionMode?: 'None' | 'Single' | 'Multi' | 'Auto';
    /**
     * Defines the type of table that will be used by the building block to render the data.
     * Allowed values are `GridTable` and `ResponsiveTable`.
     * Default value is `ResponsiveTable`.
     */
    type?: 'GridTable' | 'ResponsiveTable';
    /**
     * Controls the kind of variant management that should be enabled for the table.
     * Allowed values are `Page`, `Control` and `None`.
     * If the table is used within a SAP Fiori elements template, the default value will be taken from
     * the current page variant management.
     * Otherwise it's `None`.
     */
    variantManagement?: string;
}

/**
 * Building block used to create a page.
 * The page building block allows configuration of the title, and description.
 *
 * @example
 * <macro:Page title="My Page Title" description="My Page Description" />
 * @extends {BuildingBlock}
 */
export interface Page extends BuildingBlock {
    /**
     * The title of the page.
     */
    title?: string;

    /**
     * The description of the page.
     */
    description?: string;
}

export interface CustomColumn extends BuildingBlock {
    title: string;
    width?: string;
    columnKey?: string;
    position?: Position;
    embededFragment?: EmbededFragment;
}

export type EmbededFragment = EventHandler & CustomFragment & CustomElement & FragmentContentData;

/**
 * Building block used to create a rich text editor based on the metadata provided by OData V4.
 * MetaPath construction example: metaPath="/EntitySet/targetProperty"
 *
 * @example
 *  <macros:RichTextEditorWithMetadata metaPath="_Agency/AgencyID" id="RichTextEditor2">
 *       <macros:buttonGroups>
 *          <richtexteditor:ButtonGroup name="font-style" visible="true" priority="10" buttons="bold,italic,underline"/>
 *      </macros:buttonGroups>
 *  </macros:RichTextEditorWithMetadata>
 * @extends {BuildingBlock}
 */
export interface RichTextEditor extends BuildingBlock {
    /**
     * Property used to construct the metaPath for Rich Text Editor, e.g. "/EntitySet/targetProperty".
     */
    targetProperty?: string;
}

/**
 * Input configuration for the generate function.
 */
export interface BuildingBlockConfig<T extends BuildingBlock> {
    /**
     * The path of the view or fragment xml file relative to the base path.
     */
    viewOrFragmentPath: string;

    /**
     * The aggregation xpath.
     */
    aggregationPath: string;

    /**
     * The building block parameters.
     */
    buildingBlockData: T;

    /**
     * Allows updating the 'manifest.json' file with missing dependency libraries.
     * Dependency libraries are listed under '"sap.ui5"/"dependencies"/"libs"', and 'sap.fe.macros' is required for Building Blocks.
     *
     * @default true
     */
    allowAutoAddDependencyLib?: boolean;

    /**
     * If true, replaces the element selected by aggregationPath in the view with the page building block.
     * If false or undefined, the page building block will be appended.
     */
    replace?: boolean;
}
