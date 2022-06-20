/**
 * Legacy tests with large snapshots.
 */
import { join } from 'path';
import { readFileSync } from 'fs';

import type { XMLDocument } from '@xml-tools/ast';
import { buildAst } from '@xml-tools/ast';
import type { DocumentCstNode } from '@xml-tools/parser';
import { parse } from '@xml-tools/parser';

import { xmlSample } from './data/xml_sample';
import { convertMetadataDocument, convertDocument } from '../../../src/parser';
import { getGapRangeBetween, transformElementRange } from '../../../src/parser/range';

declare const expect: jest.Expect;

const DATA_DIR = join(__dirname, 'data');

const getAst = (xml: string): XMLDocument => {
    const { cst, tokenVector } = parse(xml);
    return buildAst(cst as DocumentCstNode, tokenVector);
};

function transformAst(ast: XMLDocument, isAnnotationFile = true, fileUri?: string): any {
    const rootElement = ast.rootElement!;
    const file: any = isAnnotationFile
        ? {
              range: transformElementRange(rootElement.position, rootElement),
              contentRange: getGapRangeBetween(
                  rootElement.syntax!.openBody as any,
                  rootElement.syntax!.closeName as any
              ),
              namespaces: [],
              targets: []
          }
        : {
              range: transformElementRange(rootElement.position, rootElement),
              contentRange: getGapRangeBetween(
                  rootElement.syntax!.openBody as any,
                  rootElement.syntax!.closeName as any
              ),
              namespaces: [],
              targets: [],
              metadataElementNodes: []
          };

    const annotationFile = convertDocument('file://metadata.xml', ast);
    if (annotationFile) {
        file.targets = annotationFile.targets;
    }
    if (!isAnnotationFile) {
        const metadata = convertMetadataDocument('file://metadata.xml', ast);
        file.metadataElementNodes = metadata;
    }
    return file;
}

describe('parseXML', () => {
    it('sample 1', () => {
        const annotationFile = transformAst(getAst(xmlSample));
        expect(annotationFile).toMatchSnapshot();
    });
    it('v2 metadata', () => {
        const path = join(DATA_DIR, 'metadata.xml');
        const xml = readFileSync(path).toString();
        const annotationFile = transformAst(getAst(xml), false);
        expect(annotationFile).toMatchSnapshot();
    });
    it.skip('UI vocabulary', () => {
        const path = join(DATA_DIR, 'uiVocabulary.xml');
        const xml = readFileSync(path).toString();
        const annotationFile = transformAst(getAst(xml), false);
        expect(annotationFile).toMatchSnapshot();
    });
    it('v4 metatdata', () => {
        const path = join(DATA_DIR, 'metadata2.xml');
        const xml = readFileSync(path).toString();
        const annotationFile = transformAst(getAst(xml), false);
        expect(annotationFile).toMatchSnapshot();
    });
    it('annotation file with open opening element', () => {
        const path = join(DATA_DIR, 'partial.xml');
        const xml = readFileSync(path).toString();
        const annotationFile = transformAst(getAst(xml), false);
        expect(annotationFile).toMatchSnapshot();
    });
});
