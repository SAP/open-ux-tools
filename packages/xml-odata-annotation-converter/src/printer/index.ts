export {
    serializeAttribute,
    getNewAnnotationFile,
    serializeElement,
    serializeReference,
    serializeTarget
} from './serializerEdmx';
export * from './namespaces';
export { printCsdlNodeToXmlString, PrintContext, escapeAttribute } from './csdlToXml';
export { insert, insertWithOptions } from './documentModifier';
