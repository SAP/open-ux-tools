import { pathToFileURL } from 'url';
import { join } from 'path';

import { VocabularyService } from '@sap-ux/odata-vocabularies';

import type { CdsCompilerFacade } from '@sap/ux-cds-compiler-facade';
import { createCdsCompilerFacadeForRoot, createMetadataCollector } from '@sap/ux-cds-compiler-facade';
import type { AnnotationGroup } from '@sap-ux/cds-annotation-parser';

import { getDocument } from '../../../src/cds/document';
import type { Document } from '../../../src/cds/document';
import { getAnnotationFromAssignment } from '../../../src/cds/utils';

import { PROJECTS } from '../projects';

const vocabularyService = new VocabularyService(true);

async function getCDSDocument(root: string, text: string): Promise<[CdsCompilerFacade, Document]> {
    const fileName = 'test.cds';
    const filePath = join(root, fileName);
    const fileUri = pathToFileURL(filePath).toString();
    const fileCache = new Map([[fileUri, text]]);

    const facade = await createCdsCompilerFacadeForRoot(root, [filePath], fileCache);
    const metadataElementMap = facade.getMetadata('S');
    const metadataCollector = createMetadataCollector(metadataElementMap, facade);
    return [facade, getDocument('S', vocabularyService, facade, fileCache, { uri: fileUri }, metadataCollector)];
}

describe('getAnnotationFromAssignment', () => {
    test('target node', async () => {
        const [facade, document] = await getCDSDocument(
            PROJECTS.V4_CDS_START.root,
            `Service S { entity E {}; };
        annotate S.E with @(
            UI.LineItem : []
        );`
        );
        const [annotation, target] = getAnnotationFromAssignment(facade, document.ast.targets[0]);
        expect(annotation.type).toStrictEqual('annotation');
        expect(annotation.term.value).toStrictEqual('UI.LineItem');
        expect(target).toStrictEqual('S.E');
    });
    test('annotation node', async () => {
        const [facade, document] = await getCDSDocument(
            PROJECTS.V4_CDS_START.root,
            `Service S { entity E {}; };
        annotate S.E with @(
            UI.LineItem : []
        );`
        );
        const targetNode = document.ast.targets[0];
        const [annotation, target] = getAnnotationFromAssignment(facade, targetNode.assignments[0], targetNode);
        expect(annotation.type).toStrictEqual('annotation');
        expect(annotation.term.value).toStrictEqual('UI.LineItem');
        expect(target).toStrictEqual('S.E');
    });
    test('annotation node in group', async () => {
        const [facade, document] = await getCDSDocument(
            PROJECTS.V4_CDS_START.root,
            `Service S { entity E {}; };
        annotate S.E with @(
            UI: {
                LineItem : []
            }
        );`
        );
        const targetNode = document.ast.targets[0];
        const [annotation, target] = getAnnotationFromAssignment(
            facade,
            (targetNode.assignments[0] as AnnotationGroup).items.items[0],
            (targetNode.assignments[0] as AnnotationGroup).items,
            targetNode
        );
        expect(annotation.type).toStrictEqual('annotation');
        expect(annotation.term.value).toStrictEqual('LineItem');
        expect(target).toStrictEqual('S.E');
    });
    test('wrong parameters', async () => {
        const [facade, document] = await getCDSDocument(
            PROJECTS.V4_CDS_START.root,
            `Service S { entity E {}; };
        annotate S.E with @(
            UI: {
                LineItem : []
            }
        );`
        );
        const targetNode = document.ast.targets[0];
        expect(() => {
            getAnnotationFromAssignment(facade, (targetNode.assignments[0] as AnnotationGroup).items, targetNode);
        }).toThrow();
    });
});
