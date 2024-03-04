export {
    serializeAttribute,
    getNewAnnotationFile,
    serializeElement,
    serializeReference,
    serializeTarget
} from './serializer-edmx';
export * from './namespaces';
export { printCsdlNodeToXmlString, PrintContext, escapeAttribute } from './csdl-to-xml';
export { insert, insertWithOptions } from './document-modifier';
