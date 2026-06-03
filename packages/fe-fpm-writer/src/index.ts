export type { CustomPage, ObjectPage, ListReport } from './page/types.js';
export { generateCustomPage, generateObjectPage, generateListReport } from './page/index.js';

export type { CustomAction } from './action/types.js';
export { TargetControl } from './action/types.js';
export { generateCustomAction } from './action/index.js';

export type { ActionMenu } from './action-menu/types.js';
export { TargetControl as ActionMenuTargetControl } from './action-menu/types.js';
export { generateActionMenu } from './action-menu/index.js';

export type { CustomTableColumn } from './column/types.js';
export { generateCustomColumn } from './column/index.js';

export type { CustomHeaderSection, CustomSection, CustomSubSection } from './section/types.js';
export { RequestGroupId, DesignTime } from './section/types.js';
export { generateCustomSection, generateCustomSubSection, generateCustomHeaderSection } from './section/index.js';

export type { CustomFilter } from './filter/types.js';
export { generateCustomFilter } from './filter/index.js';

export type { CustomView } from './view/types.js';
export { generateCustomView } from './view/index.js';

export { enableFPM } from './app/index.js';
export type { FPMConfig } from './app/index.js';

export { validateBasePath, validateVersion } from './common/validate.js';
export { createIdGenerator, type IdGeneratorFunction, getRelativeTemplateComponentPath } from './common/file.js';

export { BuildingBlockType } from './building-block/types.js';
export type {
    FilterBar,
    Form,
    Chart,
    Field,
    FieldFormatOptions,
    Table,
    BuildingBlockConfig,
    Page,
    CustomColumn,
    CustomFilterField,
    CustomFormField,
    RichTextEditor,
    ButtonGroupConfig,
    Action
} from './building-block/types.js';
export { generateBuildingBlock, getSerializedFileContent } from './building-block/index.js';
export type {
    ChartPromptsAnswer,
    FilterBarPromptsAnswer,
    FormPromptsAnswer,
    TablePromptsAnswer,
    PagePromptsAnswer,
    RichTextEditorPromptsAnswer,
    RichTextEditorButtonGroupsPromptsAnswer,
    BuildingBlockTypePromptsAnswer
} from './building-block/prompts/questions/index.js';
export { PromptsType, PromptsAPI } from './prompts/index.js';
export type {
    SupportedGeneratorAnswers,
    PromptsGroup,
    Prompts,
    ValidationResults,
    Answers,
    Subset,
    CodeSnippet
} from './prompts/index.js';

export type { ControllerExtension } from './controller-extension/types.js';
export { ControllerExtensionPageType } from './controller-extension/types.js';
export { generateControllerExtension } from './controller-extension/index.js';

export type { CustomField } from './field/types.js';
export { generateCustomField } from './field/index.js';

export { initI18n } from './i18n.js';
