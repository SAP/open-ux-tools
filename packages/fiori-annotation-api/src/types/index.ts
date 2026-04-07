export { type TextFile } from './text-file';
export { type CDSService, type LocalEDMXService, type Service, type CompiledService } from './service';
export { type AnnotationServiceAdapter, type AnnotationServiceConstructor, type ServiceArtifacts } from './adapter';
export {
    DELETE_ATTRIBUTE,
    DELETE_ELEMENT,
    INSERT_ATTRIBUTE,
    INSERT_ELEMENT,
    INSERT_TARGET,
    MOVE_ELEMENT,
    UPDATE_ATTRIBUTE_VALUE,
    UPDATE_ELEMENT_NAME,
    REPLACE_ATTRIBUTE,
    REPLACE_ELEMENT,
    REPLACE_ELEMENT_CONTENT,
    REPLACE_TEXT,
    type AnnotationFileChange,
    type DeleteReference,
    type DeleteElement,
    type DeleteAttribute,
    type UpdateAttributeValue,
    type ReplaceElementContent,
    type ReplaceElement,
    type InsertTarget,
    type InsertElement,
    type InsertAttribute,
    type ReplaceAttribute,
    type ReplaceText,
    type MoveElements
} from './internal-change';
export * from './change';
export * from './project-info';
