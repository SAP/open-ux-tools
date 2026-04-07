export {
    serializeAttribute,
    getNewAnnotationFile,
    serializeElement,
    serializeReference,
    serializeTarget
} from './serializer-edmx';
export * from './namespaces';
export { printCsdlNodeToXmlString, escapeAttribute } from './csdl-to-xml';
export type { PrintContext } from './csdl-to-xml';
export { insert, insertWithOptions } from './document-modifier';
