// Stub for @sap-ux/fe-fpm-writer — prevents the fe-fpm-writer → fiori-annotation-api →
// @sap/ux-cds-compiler-facade CJS require chain triggered by the ux-specification.mjs mock.
// Only the symbols imported by add-building-block.ts need to be present.
module.exports = {
    generateBuildingBlock: async () => ({ commit: async () => {}, dump: () => ({}) }),
    createIdGenerator: async () => () => 'generated-id',
    getFragmentAndViewFiles: async () => [],
    getXPathStringsForXmlFile: () => ({ inputChoices: {} }),
    MIN_UI5_VERSION_RICH_TEXT_EDITOR: '1.117.0',
    MIN_UI5_VERSION_PAGE_BUILDING_BLOCK: '1.136.0',
    MIN_UI5_VERSION_PAGE_BUILDING_BLOCK_FULL_LAYOUT: '1.145.0',
    BuildingBlockType: {
        FilterBar: 'filter-bar',
        Chart: 'chart',
        CustomFilterField: 'custom-filter-field',
        CustomFormField: 'custom-form-field',
        Field: 'field',
        Form: 'form',
        Page: 'page',
        Table: 'table',
        CustomColumn: 'custom-column',
        RichTextEditor: 'rich-text-editor',
        RichTextEditorButtonGroups: 'rich-text-editor-button-groups',
        Action: 'action'
    }
};
