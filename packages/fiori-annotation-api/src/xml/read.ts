import type { XMLDocument } from '@xml-tools/ast';
import { buildAst } from '@xml-tools/ast';
import type { DocumentCstNode } from '@xml-tools/parser';
import { parse } from '@xml-tools/parser';

import { convertDocument, convertMetadataDocument } from '@sap-ux/xml-annotation-converter';

import type { LocalService, CompiledService, TextFile } from '../services';

/**
 * Compiles local service with annotation files.
 *
 * @param service
 * @returns
 */
export function readXmlAnnotations(service: LocalService): CompiledService {
    const annotationFileParameters: [string, XMLDocument][] = [];

    // Metadata files can contain annotations and they should be included in the model.
    const metadataDocument = parseFile(service.metadataFile);
    annotationFileParameters.push([service.metadataFile.uri, metadataDocument]);

    for (const file of service.annotationFiles) {
        const ast = parseFile(file);
        annotationFileParameters.push([file.uri, ast]);
    }

    return {
        annotationFiles: annotationFileParameters.map((params) => convertDocument(...params)),
        metadata: convertMetadataDocument(service.metadataFile.uri, metadataDocument)
    };
}

function parseFile(file: TextFile): XMLDocument {
    const { cst, tokenVector } = parse(file.content);
    return buildAst(cst as DocumentCstNode, tokenVector);
}
