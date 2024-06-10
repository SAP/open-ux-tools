export { TextFile } from './text-file';
export { CDSService, LocalEDMXService, Service, CompiledService } from './service';
export { AnnotationServiceAdapter, AnnotationServiceConstructor } from './adapter';
export {
    DELETE_ATTRIBUTE,
    DELETE_ELEMENT,
    INSERT_ATTRIBUTE,
    INSERT_ELEMENT,
    INSERT_TARGET,
    MOVE_ELEMENT,
    UPDATE_ATTRIBUTE_VALUE,
    UPDATE_ELEMENT_NAME,
    AnnotationFileChange,
    DeleteReference,
    DeleteElement,
    DeleteAttribute,
    UpdateAttributeValue,
    ReplaceElementContent,
    ReplaceElement,
    InsertTarget,
    InsertElement,
    InsertAttribute,
    ReplaceAttribute,
    ReplaceText,
    MoveElements
} from './internal-change';
export * from './change';
export * from './project-info';
