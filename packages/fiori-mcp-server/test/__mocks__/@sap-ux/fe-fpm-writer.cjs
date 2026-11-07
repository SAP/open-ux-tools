// Stub for @sap-ux/fe-fpm-writer — prevents the fe-fpm-writer → fiori-annotation-api →
// @sap/ux-cds-compiler-facade CJS require chain triggered by the ux-specification.mjs mock.
// Only the symbols imported by the building-block tools need to be present.

// Minimal PromptsAPI: returns no questions so prompt-derived-schema falls back to the hand-written
// members. The question→Zod conversion itself is covered by unit tests that call the converter
// directly with synthetic questions.
class PromptsAPI {
    static async init() {
        return new PromptsAPI();
    }
    async getPrompts() {
        return { questions: [] };
    }
}

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
    },
    PromptsType: {
        FilterBar: 'filter-bar',
        Form: 'form',
        Chart: 'chart',
        Table: 'table',
        Page: 'page',
        BuildingBlocks: 'building-blocks',
        RichTextEditor: 'rich-text-editor',
        RichTextEditorButtonGroups: 'rich-text-editor-button-groups'
    },
    PromptsAPI
};
