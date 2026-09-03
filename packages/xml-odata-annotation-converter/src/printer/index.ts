export {
    serializeAttribute,
    getNewAnnotationFile,
    serializeElement,
    serializeReference,
    serializeTarget
} from './serializer-edmx.js';
export * from './namespaces.js';
export { printCsdlNodeToXmlString, escapeAttribute } from './csdl-to-xml.js';
export type { PrintContext } from './csdl-to-xml.js';
export { insert, insertWithOptions } from './document-modifier.js';
