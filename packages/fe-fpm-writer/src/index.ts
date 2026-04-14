export type { CustomPage, ObjectPage, ListReport } from './page/types';
export { generateCustomPage, generateObjectPage, generateListReport } from './page';

export type { CustomAction } from './action/types';
export { TargetControl } from './action/types';
export { generateCustomAction } from './action';

export type { ActionMenu } from './action-menu/types';
export { TargetControl as ActionMenuTargetControl } from './action-menu/types';
export { generateActionMenu } from './action-menu';

export type { CustomTableColumn } from './column/types';
export { generateCustomColumn } from './column';

export type { CustomHeaderSection, CustomSection, CustomSubSection } from './section/types';
export { RequestGroupId, DesignTime } from './section/types';
export { generateCustomSection, generateCustomSubSection, generateCustomHeaderSection } from './section';

export type { CustomFilter } from './filter/types';
export { generateCustomFilter } from './filter';

export type { CustomView } from './view/types';
export { generateCustomView } from './view';

export { enableFPM } from './app';
export type { FPMConfig } from './app';

export { validateBasePath, validateVersion } from './common/validate';
export { createIdGenerator, type IdGeneratorFunction, getRelativeTemplateComponentPath } from './common/file';

export { BuildingBlockType } from './building-block/types';
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
} from './building-block/types';
export { generateBuildingBlock, getSerializedFileContent } from './building-block';
export type {
    ChartPromptsAnswer,
    FilterBarPromptsAnswer,
    FormPromptsAnswer,
    TablePromptsAnswer,
    PagePromptsAnswer,
    RichTextEditorPromptsAnswer,
    RichTextEditorButtonGroupsPromptsAnswer,
    BuildingBlockTypePromptsAnswer
} from './building-block/prompts/questions';
export { PromptsType, PromptsAPI } from './prompts';
export type {
    SupportedGeneratorAnswers,
    PromptsGroup,
    Prompts,
    ValidationResults,
    Answers,
    Subset,
    CodeSnippet
} from './prompts';

export type { ControllerExtension } from './controller-extension/types';
export { ControllerExtensionPageType } from './controller-extension/types';
export { generateControllerExtension } from './controller-extension';

export type { CustomField } from './field/types';
export { generateCustomField } from './field';

export { initI18n } from './i18n';
