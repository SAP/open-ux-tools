import { readFile } from 'node:fs/promises';
import { CdsAnnotationProvider, getXmlServiceArtifacts } from '../../src';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { adaptedUrl, normalizeAnnotationNode, normalizeUriInKey } from './raw-metadata-serializer';
import { PROJECTS } from './projects';

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
        test('v4', async () => {
            const project = PROJECTS.V4_CDS_START;
            const metadataPath = fileURLToPath(project.files.metadata);
            const metadata = await readFile(metadataPath, 'utf-8');
            const annotationFilePath = fileURLToPath(project.files.annotations);
            const annotations = await readFile(annotationFilePath, 'utf-8');
            const fileCache = new Map([
                [project.files.metadata, metadata],
                [project.files.annotations, annotations]
            ]);

            expect(() => {
                const artifacts = CdsAnnotationProvider.getCdsServiceArtifacts(
                    '4.0',
                    '/here/goes/your/serviceurl/',
                    fileCache
                );
            }).toThrow();
        });
    });
});
