import { join } from 'path';
import type { Position } from '@sap-ux/text-document-utils';

import { VocabularyService } from '@sap-ux/odata-vocabularies';

import { prepare } from '../setup';
import { toAbsoluteUriString } from '../../src';
import { toAnnotationFile, toTarget, toTargetMap } from '../../src/transforms/annotation-file';

import { pathToFileURL } from 'url';
import type { MetadataElementMap, CdsCompilerFacade } from '@sap/ux-cds-compiler-facade';
import type { MetadataElement } from '@sap-ux/odata-annotation-core-types';
import { createMetadataCollector } from '@sap/ux-cds-compiler-facade';

const testDataFolder = '../data';
const cdsProjectFolder = 'bookshop';
const cdsServiceName = 'AdminService';

// global artifacts which are prepared once, should NOT be changed in tests
// if changes are needed, call prepare() inside your test to generate custom artifacts
let projectRoot: string;
let cdsCompilerFacade: CdsCompilerFacade;
let metadataElementMap: MetadataElementMap;
const serializeForSnapshot = (metadataElementMap: MetadataElementMap): string[] => {
    return [...metadataElementMap.keys()].sort().map((nodeName) => {
        const entry = metadataElementMap.get(nodeName);
        return `${nodeName} => ${entry?.parentKey ?? 'ROOT'} => ${entry?.node.name}`;
    });
};

beforeAll(async (): Promise<void> => {
    const {
        projectRoot: root,
        cdsCompilerFacade: facade,
        metadataElementMap: mdElementMap
    } = await prepare(join(__dirname, testDataFolder, cdsProjectFolder), cdsServiceName);
    projectRoot = root;
    cdsCompilerFacade = facade;
    metadataElementMap = mdElementMap;
});

describe('lib/cds-annotation-adapter/transforms/annotationFile', () => {
    let vocabularyService: VocabularyService;
    let position: Position;

    beforeEach(() => {
        vocabularyService = new VocabularyService(true);
    });

    test('toAnnotationFile', () => {
        // Prepare
        const metadataCollector = createMetadataCollector(metadataElementMap, cdsCompilerFacade);

        const fileUri = join('app/admin/fiori-service.cds');
        const absoluteUriString = toAbsoluteUriString(projectRoot, fileUri);
        const blitzIndex = cdsCompilerFacade?.blitzIndex;
        const fileIndex = blitzIndex ? blitzIndex.forUri(absoluteUriString) : undefined;
        let result;
        if (fileIndex) {
            const cdsAnnotationFile = toTargetMap(fileIndex, absoluteUriString, vocabularyService, cdsCompilerFacade);
            result = toAnnotationFile(fileUri, vocabularyService, cdsAnnotationFile, metadataCollector, position);
            result.file.references[0].uri = result?.file?.references[0]?.uri?.split('packages')[1].replace(/\\/g, '/'); // remove user dependent data
            result.file.uri = result.file.uri.replace(/\\/g, '/'); // remove OS dependent data
        }
        // Act
        // Expect
        expect(result).toMatchSnapshot();
        // check metadata is not collected multiple times for Author
        const authorSubnodeNames =
            metadataCollector?.metadataElementMap
                ?.get('AdminService.Books')
                ?.node?.content?.map((entry: any) => entry.name) ?? [];
        expect(authorSubnodeNames).toMatchInlineSnapshot(`
            Array [
              "createdAt",
              "createdBy",
              "modifiedAt",
              "modifiedBy",
              "ID",
              "title",
              "Title",
              "TITLE",
              "descr",
              "author",
              "author_author_ID",
              "stock",
              "price",
              "currency",
              "currency_code",
              "texts",
            ]
        `);
    });

    test('toAnnotationFile (cds annos)', () => {
        // Prepare
        const metadataCollector = createMetadataCollector(metadataElementMap, cdsCompilerFacade);

        const fileUri = join('db/schema.cds');
        const absoluteUriString = toAbsoluteUriString(projectRoot, fileUri);
        const sourcePath = join(projectRoot, fileUri);
        const fileUriWithSchema = pathToFileURL(sourcePath).toString();
        const blitzIndex = cdsCompilerFacade?.blitzIndex?.forUri(fileUriWithSchema) ?? undefined;
        let result;

        if (blitzIndex) {
            const cdsAnnotationFile = toTargetMap(blitzIndex, absoluteUriString, vocabularyService, cdsCompilerFacade);

            // Act
            result = toAnnotationFile(fileUri, vocabularyService, cdsAnnotationFile, metadataCollector, position);
            result.file.references.forEach((namespace) => (namespace.uri = '')); // user dependent & anyway not relevant
            result.file.uri = result.file.uri.replace(/\\/g, '/'); // remove OS dependent data
        }
        // Expect
        expect(result).toMatchSnapshot();
    });

    test('toTarget - uses carrierName if provided', () => {
        // Prepare
        const carrierName = 'testCarrierName';

        // Act
        const result = toTarget(undefined, carrierName);

        // Expect
        expect(result.name).toBe(carrierName);
    });

    test('toAnnotationFile (with metadata collection)', async () => {
        const { cdsCompilerFacade: facade2 } = await prepare(
            join(__dirname, testDataFolder, cdsProjectFolder),
            cdsServiceName,
            [join('app/admin/fiori-service.cds')]
        );
        const compilerFacadePlus: CdsCompilerFacade = facade2;
        const result: Map<string, string[]> = new Map();
        const actionBindingParamKey = 'AdminService.Books/addRating()/_it2';
        let actionBindingParameterMdElement: MetadataElement = {
            path: '',
            content: [],
            isAnnotatable: true,
            name: '',
            kind: '',
            targetKinds: []
        };
        compilerFacadePlus
            ?.getAllSourceUris()
            .sort()
            .forEach((fileUri) => {
                // Prepare
                const metadataElementMap = new Map();
                const metadataCollector = createMetadataCollector(metadataElementMap, compilerFacadePlus);

                const fileUriWithSchema = pathToFileURL(fileUri).toString();
                const blitzIndex = compilerFacadePlus?.blitzIndex?.forUri(fileUriWithSchema) ?? undefined;
                if (blitzIndex) {
                    const cdsAnnotationFile = toTargetMap(
                        blitzIndex,
                        fileUriWithSchema,
                        vocabularyService,
                        compilerFacadePlus
                    );

                    // Act - metadata required for file should be collected in metadataCollector
                    toAnnotationFile(fileUri, vocabularyService, cdsAnnotationFile, metadataCollector, position);
                    if (metadataElementMap.has(actionBindingParamKey)) {
                        actionBindingParameterMdElement = metadataElementMap.get(actionBindingParamKey).node;
                    }
                }
                // make file uri snapshot safe and record result
                const segments = fileUri.replace(/\\/g, '/').split('/');
                const rootIndex = segments.lastIndexOf('bookshop');
                if (rootIndex >= 0) {
                    const fileUriForSnapshot = segments.slice(rootIndex).join('/');
                    result.set(fileUriForSnapshot, serializeForSnapshot(metadataCollector.metadataElementMap));
                }
            });

        // Expect
        expect(result).toMatchSnapshot();
        // make sure metadata has been collected from "Common.SideEffects.TargetProperties: ['_it2/author_ID']",
        expect(actionBindingParameterMdElement).toBeTruthy();
        // make sure path in MetadataElement is build with OData conform segment for bound action/function
        expect(actionBindingParameterMdElement?.path).toMatchInlineSnapshot(
            `"AdminService.addRating(AdminService.Books)/_it2"`
        );
    });
});
