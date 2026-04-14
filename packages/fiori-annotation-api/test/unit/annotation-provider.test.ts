import { readFile } from 'node:fs/promises';
import { CdsAnnotationProvider, getXmlServiceArtifacts } from '../../src';
import { fileURLToPath } from 'node:url';
import { adaptedUrl, normalizeAnnotationNode, normalizeUriInKey } from './raw-metadata-serializer';
import { npmInstall, PROJECTS, V4_CDS_LATEST } from './projects';
import * as cdsCompilerFacade from '@sap/ux-cds-compiler-facade';

describe('annotation provider', () => {
    describe('xml', () => {
        test('v2', async () => {
            const project = PROJECTS.V2_XML_START;
            const metadataPath = fileURLToPath(project.files.metadata);
            const metadata = await readFile(metadataPath, 'utf-8');
            const annotationFilePath = fileURLToPath(project.files.annotations);
            const annotations = await readFile(annotationFilePath, 'utf-8');
            const fileCache = new Map([
                [project.files.metadata, metadata],
                [project.files.annotations, annotations]
            ]);
            const artifacts = getXmlServiceArtifacts(
                '4.0',
                '/here/goes/your/serviceurl/',
                {
                    uri: project.files.metadata,
                    isReadOnly: true
                },
                [
                    {
                        uri: project.files.annotations,
                        isReadOnly: false
                    }
                ],
                fileCache
            );
            expect(artifacts.path).toStrictEqual('/here/goes/your/serviceurl/');
            expect(normalizeUriInKey(artifacts.aliasInfo, project.root)).toMatchSnapshot();
            expect(artifacts.fileSequence.map((uri) => adaptedUrl(uri, project.root))).toMatchSnapshot();
            const annotationFiles = normalizeUriInKey(artifacts.annotationFiles, project.root);

            for (const file of Object.values(annotationFiles)) {
                file.uri = adaptedUrl(file.uri, project.root);
                for (const target of file.targets) {
                    for (const annotation of target.terms) {
                        annotation.content = [];
                    }
                }
                normalizeAnnotationNode(file);
            }
            expect(annotationFiles).toMatchSnapshot();
        });
    });

    describe('cds', () => {
        let fileCache: Map<string, string>;

        beforeAll(async () => {
            npmInstall(V4_CDS_LATEST.root);
            const metadataPath = fileURLToPath(V4_CDS_LATEST.files.metadata);
            const metadata = await readFile(metadataPath, 'utf-8');
            const annotationFilePath = fileURLToPath(V4_CDS_LATEST.files.annotations);
            const annotations = await readFile(annotationFilePath, 'utf-8');
            fileCache = new Map([
                [V4_CDS_LATEST.files.metadata, metadata],
                [V4_CDS_LATEST.files.annotations, annotations]
            ]);
        });

        afterEach(() => {
            jest.clearAllMocks();
        });

        test('no cdsCache', async () => {
            const artifacts = CdsAnnotationProvider.getCdsServiceArtifacts(
                V4_CDS_LATEST.root,
                'odata/v4/incident/',
                fileCache
            );
            expect(artifacts).toBeDefined();
            if (!artifacts) {
                return;
            }
            expect(artifacts?.path).toStrictEqual('odata/v4/incident/');
            expect(normalizeUriInKey(artifacts.aliasInfo, V4_CDS_LATEST.root)).toMatchSnapshot();
            expect(artifacts.fileSequence.map((uri) => adaptedUrl(uri, V4_CDS_LATEST.root))).toMatchSnapshot();
        });

        test('with cdsCache', async () => {
            const createCdsCompilerFacadeForRootSyncSpy = jest.spyOn(
                cdsCompilerFacade,
                'createCdsCompilerFacadeForRootSync'
            );
            const artifacts = CdsAnnotationProvider.getCdsServiceArtifacts(
                V4_CDS_LATEST.root,
                'odata/v4/incident/',
                fileCache
            );
            expect(createCdsCompilerFacadeForRootSyncSpy).not.toHaveBeenCalled();
            expect(artifacts).toBeDefined();
            if (!artifacts) {
                return;
            }
            expect(artifacts.path).toStrictEqual('odata/v4/incident/');
            expect(normalizeUriInKey(artifacts.aliasInfo, V4_CDS_LATEST.root)).toMatchSnapshot();
            expect(artifacts.fileSequence.map((uri) => adaptedUrl(uri, V4_CDS_LATEST.root))).toMatchSnapshot();
        });

        test('no service', async () => {
            const artifacts = CdsAnnotationProvider.getCdsServiceArtifacts(
                V4_CDS_LATEST.root,
                'invalid/service/path/',
                fileCache
            );
            expect(artifacts).toBeUndefined();
        });

        test('resetCache', async () => {
            const createCdsCompilerFacadeForRootSyncSpy = jest.spyOn(
                cdsCompilerFacade,
                'createCdsCompilerFacadeForRootSync'
            );
            CdsAnnotationProvider.resetCache(V4_CDS_LATEST.root, fileCache);
            expect(createCdsCompilerFacadeForRootSyncSpy).toHaveBeenCalled();
        });
    });
});
