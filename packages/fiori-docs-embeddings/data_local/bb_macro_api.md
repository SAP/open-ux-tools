
--------------------------------

**TITLE**: sap.fe.macros.FilterBar — Building Block API

**TAGS**: sap.fe.macros.FilterBar, FilterBar, building block, macro, metaPath, contextPath, navigationPropertiesForPersonalization, liveMode, showMessages, showClearButton, filterFields, search, filterChanged, afterClear, ignorePersonalizationChanges

**INTRODUCTION**: Building block for creating a FilterBar based on the metadata provided by OData V4.
{@link demo:sap/fe/core/fpmExplorer/index.html#/buildingBlocks/filterBar/filterBarDefault Overview of Building Blocks}
<br>
Usually, a SelectionFields annotation is expected.


Usage example:
<pre>
&lt;macros:FilterBar id="MyFilterBar" metaPath="@com.sap.vocabularies.UI.v1.SelectionFields" /&gt;
</pre>

### metaPath (string) [required]
Defines the relative path of the property in the metamodel, based on the current contextPath.
expectedAnnotations: com.sap.vocabularies.UI.v1.SelectionFields

### contextPath (string) [optional]
Defines the path of the context used in the current page or block.
This setting is defined by the framework.

### navigationPropertiesForPersonalization (string[]) [optional]
Comma separated list of navigation properties which are considered for filtering.

### liveMode (boolean) [optional]
If true, the search is triggered automatically when a filter value is changed.

### showMessages (boolean) [optional]
Displays possible errors during the search in a message box

### showClearButton (boolean) [optional]
Handles the visibility of the 'Clear' button on the FilterBar.

### filterFields (sap.fe.macros.filterBar.FilterField) [optional]
Aggregate filter fields of the FilterBar building block

### search (event) [optional]
This event is fired when the 'Go' button is pressed or after a condition change.

### filterChanged (event) [optional]
This event is fired after either a filter value or the visibility of a filter item has been changed. The event contains conditions that are used as filters.

### afterClear (event) [optional]
This event is fired when the 'Clear' button is pressed. This is only possible when the 'Clear' button is enabled.

### ignorePersonalizationChanges (boolean) [optional]
Only use this mode when the building block is used in a temporary context, such as in a dialog,
and you don't want end-user personalization to persist across multiple invocations.

When set to <code>true</code>, end-user personalization changes are retained only for the current invocation instance
and are discarded on the next invocation, such as when the dialog is reopened.
Additionally, if the building block is associated with a variant,
changing the selected variant will not save or restore that variant in the next invocation.

Note: Don't use <code>ignorePersonalizationChanges</code> on a filter bar with an existing ID. Create a new ID
for the control to use this feature.
@since 1.151.0

--------------------------------

**TITLE**: sap.fe.macros.Table — Building Block API

**TAGS**: sap.fe.macros.Table, Table, building block, macro, metaPath, contextPath, enableFullScreen, enableExport, exportFileName, exportSheetName, frozenColumnCount, disableColumnFreeze, rowCountMode, rowCount, enablePaste, disableCopyToClipboard, scrollThreshold, threshold, popinLayout, isSearchable, ignorePersonalizationChanges, type, selectionMode, condensedTableLayout, actions, actionOverflowGroups, columns, readOnly, filterBar, enableAutoColumnWidth, widthIncludingColumnHeader, modeForNoDataMessage, busy, variantManagement, ignoredFields, exportRequestSize, initialLoad, personalization, header, headerVisible, enablePastingOfComputedProperties, enableSelectAll, selectionLimit, creationMode, noData, analyticalConfiguration, quickVariantSelection, massEdit, beforeRebindTable, rowPress, selectionChange

**INTRODUCTION**: Building block used to create a table based on the metadata provided by OData V4.
<br>
Usually, a LineItem, PresentationVariant, or SelectionPresentationVariant annotation is expected, but the Table building block can also be used to display an EntitySet.
<br>
If a PresentationVariant is specified, then it must have UI.LineItem as the first property of the Visualizations.
<br>
If a SelectionPresentationVariant is specified, then it must contain a valid PresentationVariant that also has a UI.LineItem as the first property of the Visualizations.

Usage example:
<pre>
&lt;macros:Table id="MyTable" metaPath="@com.sap.vocabularies.UI.v1.LineItem" /&gt;
</pre>
{@link demo:sap/fe/core/fpmExplorer/index.html#/buildingBlocks/table/tableDefault Overview of Table Building Blocks}

### metaPath (string) [required]
Defines the relative path to a LineItem, PresentationVariant, or SelectionPresentationVariant in the metamodel, based on the current contextPath.
expectedAnnotations: com.sap.vocabularies.UI.v1.LineItem, com.sap.vocabularies.UI.v1.PresentationVariant, com.sap.vocabularies.UI.v1.SelectionPresentationVariant

### contextPath (string) [optional]
Defines the path of the context used in the current page or block.
This setting is defined by the framework.

### enableFullScreen (boolean) [optional]
Controls whether the table can be opened in full-screen mode or not.

### enableExport (boolean) [optional]
Controls if the export functionality of the table is enabled or not.

### exportFileName (string) [optional]
Configures the file name of exported table.
It's limited to 31 characters. If the name is longer, it is truncated.

### exportSheetName (string) [optional]
Configures the sheet name of exported table.
It's limited to 31 characters. If the name is longer, it is truncated.

### frozenColumnCount (int) [optional]
Number of columns that are fixed on the left. Only columns which are not fixed can be scrolled horizontally.

This property is not relevant for responsive tables

### disableColumnFreeze (boolean) [optional]
Determines whether the number of fixed columns can be configured in the Column Settings dialog.

This property doesn't apply for responsive tables

### rowCountMode (string) [optional]
Defines how the table handles the visible rows. Does not apply to responsive tables.

Allowed values are `Auto`, `Fixed`, and `Interactive`.<br/>
- If set to `Fixed`, the table always has as many rows as defined in the rowCount property.<br/>
- If set to `Auto`, the number of rows is changed by the table automatically. The table adjusts the number of rows based on the available space, which is limited by the surrounding container. The table cannot have fewer rows than defined in the `rowCount` property.<br/>
- If set to `Interactive` the table can have as many rows as defined in the rowCount property. The number of rows can be modified by dragging the resizer.<br/>

### rowCount (int) [optional]
Number of rows to be displayed in the table. Does not apply to responsive tables.

### enablePaste (boolean) [optional]
Controls if the paste functionality of the table is enabled or not.

### disableCopyToClipboard (boolean) [optional]
Controls if the copy functionality of the table is disabled or not.

### scrollThreshold (int) [optional]
Defines how many additional data records are requested from the back-end system when the user scrolls vertically in the table.

### threshold (int) [optional]
Defines the number of records to be initially requested from the back end.

### popinLayout (string) [optional]
Defines the layout options of the table popins. Only applies to responsive tables.

Allowed values are `Block`, `GridLarge`, and `GridSmall`.<br/>
- `Block`: Sets a block layout for rendering the table popins. The elements inside the popin container are rendered one below the other.<br/>
- `GridLarge`: Sets a grid layout for rendering the table popins. The grid width for each table popin is comparatively larger than GridSmall, so this layout allows less content to be rendered in a single popin row.<br/>
- `GridSmall`: Sets a grid layout for rendering the table popins. The grid width for each table popin is small, so this layout allows more content to be rendered in a single popin row.<br/>

### isSearchable (boolean) [optional]
Defines whether to display the search action.

### ignorePersonalizationChanges (boolean) [optional]
Use this mode when the table must not persist its personalization state between sessions.

When set to <code>true</code>, a transient <code>PersistenceProvider</code> is added to the table so that
personalization changes such as column visibility, sorting, and filtering are kept only for the current
session and are discarded on the next page load. In addition, variants and application states stored
with iAppState are not applied to the table.

Note: Don't use <code>ignorePersonalizationChanges</code> on a table with an existing ID. Create a new ID
for the control to use this feature.
@since 1.151.0

### type (string) [optional]
Defines the type of table that is used by the building block to render data.

Allowed values are `GridTable`, `ResponsiveTable`, and `AnalyticalTable`.

### selectionMode (string) [optional]
Defines the selection mode to be used by the table.

Allowed values are `None`, `Single`, `ForceSingle`, `Multi`, `ForceMulti`, or `Auto`.
If set to `Single`, `Multi`, or `Auto`, SAP Fiori elements hooks into the standard lifecycle to determine a consistent selection mode.
If set to `ForceSingle` or `ForceMulti`, note this may not adhere to the SAP Fiori guidelines.

### condensedTableLayout (boolean) [optional]
Determines whether the table adapts to the condensed layout.

### actions (sap.fe.macros.table.ITableActionOrGroup) [optional]
Aggregate actions of the table.

### actionOverflowGroups (sap.fe.macros.table.OverflowGroup) [optional]
Aggregate overflowGroups of the table.

### columns (sap.fe.macros.table.ITableColumn) [optional]
Aggregate columns of the table.

### readOnly (boolean) [optional]
An expression that allows you to control the 'read-only' state of the table.

If you do not set any expression, SAP Fiori elements hooks into the standard lifecycle to determine the current state.

### filterBar (string) [optional]
ID of the FilterBar building block associated with the table.

### enableAutoColumnWidth (boolean) [optional]
Specifies if the column width is automatically calculated.

### widthIncludingColumnHeader (boolean) [optional]
Indicates if the column header should be a part of the width calculation.

### modeForNoDataMessage (string) [optional]
Changes the size of the IllustratedMessage in the table, or removes it completely.
Allowed values are `illustratedMessage-Auto`, `illustratedMessage-Base`, `illustratedMessage-Dialog`, `illustratedMessage-Dot`, `illustratedMessage-Scene`, `illustratedMessage-Spot` or `text`.
@since 1.129.0

### busy (boolean) [optional]
An expression that allows you to control the 'busy' state of the table.

### variantManagement (string) [optional]
Controls the kind of variant management that should be enabled for the table.

Allowed value is `Control`.<br/>
If set with value `Control`, a variant management control is seen within the table and the table is linked to this.<br/>
If not set with any value, control level variant management is not available for this table.

### ignoredFields (string) [optional]
Comma-separated value of fields that must be ignored in the OData metadata by the Table building block.<br>
The table building block is not going to create built-in columns or offer table personalization for comma-separated value of fields that are provided in the ignoredfields.<br>
Any column referencing an ignored field is to be removed.<br>
@since 1.124.0

### exportRequestSize (int) [optional]
Maximum allowed number of records to be exported in one request.

### initialLoad (boolean) [optional]
Indicates if the table should load data when initialized.
This property is used only if a filter bar is associated with the table and doesn't use the liveMode.
If set to `true`, the table loads data on initialization if the filter bar has no mandatory filters or the mandatory filters are filled in.
If set to `false`, the table waits for the filter bar to be filled in before loading data.
The default value is `false`.

### personalization (string) [optional]
Controls which options should be enabled for the table personalization dialog.

If it is set to `true`, all possible options for this kind of table are enabled.<br/>
If it is set to `false`, personalization is disabled.<br/>
<br/>
You can also provide a more granular control for the personalization by providing a comma-separated list with the options you want to be available.<br/>
Available options are:<br/>
- Sort<br/>
- Column<br/>
- Filter<br/>
- Group<br/>
<br/>
The Group option is only applicable to analytical tables and responsive tables.<br/>

### header (string) [optional]
Specifies the header text that is shown in the table.

### headerVisible (boolean) [optional]
Controls if the header text should be shown or not.

### enablePastingOfComputedProperties (boolean) [optional]
Determine whether the data copied to the computed columns is sent to the back end.

### enableSelectAll (boolean) [optional]
Determines whether the Clear All button is enabled by default.
To enable the Clear All button by default, you must set this property to false.

### selectionLimit (int) [optional]
Defines the maximum number of rows that can be selected at once in the table.
This property does not apply to responsive tables.

### creationMode (sap.fe.macros.table.TableCreationOptions) [optional]
A set of options that can be configured.

### noData (sap.m.IllustratedMessage) [optional]
Aggregation to forward the IllustratedMessage control to the mdc control.

### analyticalConfiguration (sap.fe.macros.table.AnalyticalConfiguration) [optional]
A set of options that can be configured to control the aggregation behavior

### quickVariantSelection (sap.fe.macros.table.QuickVariantSelection) [optional]
Aggregate quickVariantSelection of the table.

### massEdit (sap.fe.macros.table.MassEdit) [optional]
Aggregate mass edit of the table.

### beforeRebindTable (event) [optional]
Before a table rebind, an event is triggered that contains information about the binding.

The event contains a parameter, `collectionBindingInfo`, which is an instance of `CollectionBindingInfoAPI`.
It can also contain an optional parameter, `quickFilterKey`, which indicates what is the quick filter key (if any) being processed for the table.
This allows you to manipulate the table's list binding.
You can use this event to attach event handlers to the table's list binding.
You can use this event to add selects, and add or read the sorters and filters.

### rowPress (event) [optional]
An event is triggered when the user chooses a row. The event contains information about which row is chosen.

You can set this to handle the navigation manually.

### selectionChange (event) [optional]
An event triggered when the selection in the table changes.

--------------------------------

**TITLE**: sap.fe.macros.Field — Building Block API

**TAGS**: sap.fe.macros.Field, Field, building block, macro, readOnly, metaPath, contextPath, change, liveChange, formatOptions, semanticObject, value, description

**INTRODUCTION**: Building block for creating a field based on the metadata provided by OData V4.
<br>
Usually, a DataField or DataPoint annotation is expected, but the field can also be used to display a property from the entity type.
When creating a Field building block, you must provide an ID to ensure everything works correctly.


Usage example:
<pre>
&lt;macros:Field id="MyField" metaPath="MyProperty" /&gt;
</pre>
<a href="/sapui5-sdk-internal/test-resources/sap/fe/core/fpmExplorer/index.html#/buildingBlocks/buildingBlockOverview" target="_blank" >Overview of Building Blocks</a>

### readOnly (boolean) [optional]
An expression that allows you to control the read-only state of the field.

If you do not set any expression, SAP Fiori elements hooks into the standard lifecycle to determine the current state.

### metaPath (string) [optional]
Defines the relative path of the property in the metamodel, based on the current contextPath.

### contextPath (string) [optional]
Defines the path of the context used in the current page or block.
This setting is defined by the framework.

### change (event) [optional]
An event containing details is triggered when the value of the field is changed.

### liveChange (event) [optional]
An event containing details is triggered when the value of the field is live changed.

<b>Note:</b> Browsing autocomplete suggestions does not fire the event.

### formatOptions (sap.fe.macros.field.FieldFormatOptions) [optional]
A set of options that can be configured.

### semanticObject (string) [optional]
Option to add semantic objects for a field.
This parameter overwrites the semantic objects defined through annotations.
Valid options are either a single semantic object, a stringified array of semantic objects,
a formatter or a single binding expression returning either a single semantic object or an array of semantic objects.

### value (string) [optional]
This is used to optionally provide an external value that comes from a different model than the OData model.
It is designed to work with a field with value help, and without support for complex value help (currency / unit).

### description (string) [optional]
This is used to optionally provide an external description that comes from a different model than the oData model.
This should be used in conjunction with the value property.

--------------------------------

**TITLE**: sap.fe.macros.FormElement — Building Block API

**TAGS**: sap.fe.macros.FormElement, FormElement, building block, macro, contextPath, metaPath, label, visible, fields, anchor, placement

**INTRODUCTION**: Building block used to create a form element based on the metadata provided by OData V4.

### contextPath (string) [optional]
Defines the path of the context used in the current page or block.
This setting is defined by the framework.

### metaPath (string) [optional]
Defines the relative path of the property in the metamodel, based on the current contextPath.

### label (string) [optional]
Label shown for the field. If not set, the label from the annotations will be shown.

### visible (boolean) [optional]
If set to false, the FormElement is not rendered.

### fields (sap.ui.core.Control) [optional]
Optional aggregation of controls that should be displayed inside the FormElement.
If not set, a default Field building block will be rendered

### anchor (string) [optional]
Reference to the key of another column already displayed in the table to properly place this one

### placement (string) [optional]
Determines where this column should be placed relative to the defined anchor

Allowed values are `Before` and `After`

--------------------------------

**TITLE**: sap.fe.macros.filterBar.FilterField — Building Block API

**TAGS**: sap.fe.macros.filterBar.FilterField, FilterField, building block, macro, key, label, anchor, placement, property, availability, showMessages, required

**INTRODUCTION**: Definition of a custom filter to be used inside the FilterBar.

The template for the FilterField has to be provided as the default aggregation


{@link demo:sap/fe/core/fpmExplorer/index.html#/buildingBlocks/filterBar/filterBarCustoms Overview of Building Blocks}

### key (string) [optional]
The property name of the FilterField

### label (string) [optional]
The text that will be displayed for this FilterField

### anchor (string) [optional]
Reference to the key of another filter already displayed in the table to properly place this one

### placement (string) [optional]
Defines where this filter should be placed relative to the defined anchor

Allowed values are `Before` and `After`

### property (string) [optional]
Defines which property are influenced by the FilterField.

This must be a valid property of the entity as this can be used for SAP Companion integration

### availability (string) [optional]
The filter field availability.

Allowed values are `Default`, `Adaptation`, and `Hidden`

### showMessages (boolean) [optional]
This property is not required at filter field level. To achieve the desired behavior, specify the showMessages property in the FilterBar building block.
@deprecated 1.135

### required (boolean) [optional]
If set, the FilterField will be marked as a mandatory field.

--------------------------------

**TITLE**: sap.fe.macros.table.Column — Building Block API

**TAGS**: sap.fe.macros.table.Column, Column, building block, macro, key, header, width, importance, horizontalAlign, widthIncludingColumnHeader, anchor, placement, properties, tooltip, availability, required, exportSettings, aiNotice, disableExport

**INTRODUCTION**: Definition of a custom column to be used inside the table.

The template for the column must be provided as the default aggregation

### key (string) [required]
Unique identifier of the column

### header (string) [required]
The text that will be displayed for this column header

### width (string) [optional]
Determines the column's width.

Allowed values are 'auto', 'value', and 'inherit', according to {@link sap.ui.core.CSSSize}

### importance (string) [optional]
Defines the column importance.

You can define which columns should be automatically moved to the pop-in area based on their importance

### horizontalAlign (string) [optional]
Aligns the header as well as the content horizontally

### widthIncludingColumnHeader (boolean) [optional]
Indicates if the column header should be a part of the width calculation.

### anchor (string) [optional]
Reference to the key of another column already displayed in the table to properly place this one

### placement (string) [optional]
Determines where this column should be placed relative to the defined anchor

Allowed values are `Before` and `After`

### properties (string[]) [optional]
Determines the properties displayed in the column

The properties allow to export, sort, group, copy, and paste in the column

### tooltip (string) [optional]
Determines the text displayed for the column tooltip

### availability (string) [optional]
The column availability

Allowed values are `Default`, `Adaptation`, `Hidden`

### required (boolean) [optional]
Determines if the information in the column is required.

### exportSettings (sap.fe.macros.table.ColumnExportSettings) [optional]
Determines the export settings for the column.

### aiNotice (sap.fe.macros.table.ColumnAINotice) [optional]
Determines the AI notice for the column.
The AI notice is used to display information related to AI features. This information is rendered as an icon in the column header.

### disableExport (boolean) [optional]
Determines if the column should be excluded from the export.

--------------------------------

**TITLE**: sap.fe.macros.table.Action — Building Block API

**TAGS**: sap.fe.macros.table.Action, Action, building block, macro, press, requiresSelection, enabled, visible, command, enableOnSelect, template

**INTRODUCTION**: Definition of a custom action to be used inside the table toolbar

### press (event) [optional]
Event handler to be called when the user chooses the action

### requiresSelection (boolean) [optional]
Defines if the action requires a selection.

### enabled (boolean) [optional]
Enables or disables the action

### visible (boolean) [optional]
Determines whether the action is visible.

### command (string) [optional]
Determines the shortcut combination to trigger the action

### enableOnSelect (string) [optional]
Determines whether the action requires selecting one item or multiple items.
Allowed values are `single` and `multi`

### template (string) [optional]
Name of the XML fragment to render as custom toolbar content.
When set, the fragment is placed in the toolbar instead of a button.
Mutually exclusive with the press event and properties related to standard buttons.

--------------------------------

**TITLE**: sap.fe.macros.richtexteditor.ButtonGroup — Building Block API

**TAGS**: sap.fe.macros.richtexteditor.ButtonGroup, ButtonGroup, building block, macro, name, visible, priority, row, customToolbarPriority, buttons

**INTRODUCTION**: Button configurations for the RichTextEditor.

### name (string) [optional]
The name of the group.

### visible (boolean) [optional]
Whether the group is visible.

### priority (int) [optional]
The priority of the group.

### row (int) [optional]
Row number in which the button should be
@deprecated since 1.136 this parameter no longer has any effect

### customToolbarPriority (int) [optional]
The priority of the group in the custom toolbar.
@deprecated since 1.136 use priority instead

### buttons (string) [optional]
The buttons to be displayed in the group.

--------------------------------

