// Stub for @sap-ux/fe-fpm-writer — prevents the fe-fpm-writer → fiori-annotation-api →
// @sap/ux-cds-compiler-facade CJS require chain triggered by the ux-specification.mjs mock.
// Exports the BuildingBlockType values and stubs for functions used by the building-block handler.
module.exports = {
    BuildingBlockType: {
        FilterBar: 'filter-bar',
        Table: 'table',
        Chart: 'chart',
        Form: 'form',
        Field: 'field',
        RichTextEditor: 'rich-text-editor',
        RichTextEditorButtonGroups: 'rich-text-editor-button-groups',
        Page: 'page',
        CustomFilterField: 'custom-filter-field',
        CustomFormField: 'custom-form-field',
        CustomColumn: 'custom-column',
        Action: 'action'
    },
    MIN_UI5_VERSION_PAGE_BUILDING_BLOCK: '1.136.0',
    MIN_UI5_VERSION_PAGE_BUILDING_BLOCK_FULL_LAYOUT: '1.145.0',
    MIN_UI5_VERSION_RICH_TEXT_EDITOR: '1.117.0',
    BUILDING_BLOCK_CONFIG: {
        'custom-column':      { aggregationConfig: { aggregationName: 'columns',      elementName: 'Column'      } },
        'custom-filter-field':{ aggregationConfig: { aggregationName: 'filterFields', elementName: 'FilterField' } },
        'custom-form-field':  { aggregationConfig: { aggregationName: 'fields',       elementName: 'FormElement' } },
        'rich-text-editor-button-groups': { aggregationConfig: { aggregationName: 'buttonGroups', elementName: 'ButtonGroup' } },
        'action':             { aggregationConfig: { aggregationName: 'actions',       elementName: 'Action'      } }
    },
    generateBuildingBlock: jest.fn().mockResolvedValue(undefined),
    createIdGenerator: jest.fn().mockResolvedValue(() => 'generated-id'),
    getFragmentAndViewFiles: jest.fn().mockResolvedValue([]),
    getXPathStringsForXmlFile: jest.fn().mockReturnValue({ inputChoices: {}, pageMacroDefinition: undefined }),
    getFilterBarIdsInFile: jest.fn().mockResolvedValue([])
};

