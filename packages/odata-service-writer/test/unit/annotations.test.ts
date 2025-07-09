import { readFile } from 'fs-extra';
import path, { dirname, join } from 'path';
import {
    getAnnotationNamespaces,
    removeAnnotationsFromCDSFiles,
    removeRemoteServiceAnnotationXmlFiles,
    updateCdsFilesWithAnnotations
} from '../../src/data/annotations';
import { t } from '../../src/i18n';
import type { Editor } from 'mem-fs-editor';
import { create } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';
import type { CdsAnnotationsInfo } from '../../src';

describe('metadata parsing', () => {
    let testDataPath,
        metadata: string,
        annotationsMultipleRef: string,
        annotationSingleRef: string,
        multischemaMetadata: string,
        invalidEdmx: string,
        missingSchema: string;

    beforeAll(async () => {
        testDataPath = join(__dirname, '../test-data/annotations-test');
        metadata = await readFile(join(testDataPath, 'metadata.xml'), 'utf-8');
        annotationsMultipleRef = await readFile(join(testDataPath, 'annotations_multiple_refs.xml'), 'utf-8');
        annotationSingleRef = await readFile(join(testDataPath, 'annotations_single_ref.xml'), 'utf-8');
        multischemaMetadata = await readFile(join(testDataPath, 'multiple_schemas.xml'), 'utf-8');
        invalidEdmx = await readFile(join(testDataPath, 'bad_metadata.xml'), 'utf-8');
        missingSchema = await readFile(join(testDataPath, 'missing_schema.xml'), 'utf-8');
    });

    it('getAnnotationNamespaces: metadata parsing', () => {
        expect(() => {
            getAnnotationNamespaces({ metadata: invalidEdmx });
        }).toThrow(/Unparseable XML was specified:/);
        expect(getAnnotationNamespaces({ metadata: missingSchema })).toEqual([]);

        expect(getAnnotationNamespaces({ metadata: multischemaMetadata })).toEqual([
            { namespace: 'SEPMRA_PROD_MAN', alias: '' },
            { namespace: 'SEPMRA_PROD_MAN_1', alias: '' }
        ]);
        expect(getAnnotationNamespaces({ metadata })).toEqual([{ namespace: 'SEPMRA_PROD_MAN', alias: '' }]);
    });

    it('getAnnotationNamespaces: annotations alias parsing', () => {
        // Check annotations defined in array
        expect(
            getAnnotationNamespaces({
                metadata: metadata,
                annotations: [{ technicalName: 'TEST_ANNOTATIONS', xml: annotationsMultipleRef }]
            })
        ).toEqual([{ namespace: 'SEPMRA_PROD_MAN', alias: 'SAP' }]);
        // Check annotations defined ar single object
        expect(
            getAnnotationNamespaces({
                metadata: metadata,
                annotations: { technicalName: 'TEST_ANNOTATIONS', xml: annotationsMultipleRef }
            })
        ).toEqual([{ namespace: 'SEPMRA_PROD_MAN', alias: 'SAP' }]);
        expect(
            getAnnotationNamespaces({
                metadata: metadata,
                annotations: { technicalName: 'TEST_ANNOTATIONS', xml: annotationSingleRef }
            })
        ).toEqual([{ namespace: 'SEPMRA_PROD_MAN', alias: 'SAP_Products' }]);
        expect(
            getAnnotationNamespaces({
                metadata: multischemaMetadata,
                annotations: { technicalName: 'TEST_ANNOTATIONS', xml: annotationsMultipleRef }
            })
        ).toEqual([
            { namespace: 'SEPMRA_PROD_MAN', alias: 'SAP' },
            { namespace: 'SEPMRA_PROD_MAN_1', alias: '' }
        ]);
    });
});

describe('updates cds files correctly', () => {
    let fs: Editor;
    beforeEach(async () => {
        fs = create(createStorage());
    });
    it('writes annotation cds files correctly', async () => {
        const annotationsInfo: CdsAnnotationsInfo = {
            cdsFileContents: '"using AdminService as service from \'../../srv/admin-service\';"',
            projectPath: 'testProject',
            appPath: 'webapp',
            projectName: 'annotations'
        };
        const annotationPath = join('./testProject/webapp/annotations', 'annotations.cds');
        await updateCdsFilesWithAnnotations(annotationsInfo, fs);
        const annotationCds = fs.read(annotationPath);
        expect(annotationCds).toEqual(annotationsInfo.cdsFileContents);
        // Convert the annotation path to the services path
        const serviceCdsPath = join(path.dirname(annotationPath).replace('annotations', ''), 'services.cds');
        const serviceCds = fs.read(serviceCdsPath);
        expect(serviceCds).toContain(`using from './annotations/annotations';`);
    });

    it('writes annotation cds files correctly for multiple annotations', async () => {
        const annotationsInfo: CdsAnnotationsInfo[] = [
            {
                cdsFileContents: '"using AdminService as service from \'../../srv/admin-service\';"',
                projectPath: 'testProject',
                appPath: 'webapp',
                projectName: 'annotations'
            },
            {
                cdsFileContents: '"using IncidentService as service from \'../../srv/incidentservice\';"',
                projectPath: 'testProject',
                appPath: 'webapp',
                projectName: 'annotations'
            }
        ];
        const annotationsPath = join('./testProject/webapp/annotations', 'annotations.cds');
        await updateCdsFilesWithAnnotations(annotationsInfo, fs);
        const annotationCds = fs.read(annotationsPath);
        expect(annotationCds).toContain(annotationsInfo[0].cdsFileContents);
        expect(annotationCds).toContain(annotationsInfo[1].cdsFileContents);
        // Convert the annotation path to the services path
        const serviceCdsPath = path.join(path.dirname(annotationsPath).replace('annotations', ''), 'services.cds');
        const serviceCds = fs.read(serviceCdsPath);
        expect(serviceCds).toContain(`using from './annotations/annotations';`);
    });
});

describe('removeAnnotationsFromCDSFiles', () => {
    let fs: Editor;
    beforeEach(async () => {
        fs = create(createStorage());
    });
    it('removes from annotation cds files correctly', async () => {
        const annotationsInfo: CdsAnnotationsInfo = {
            cdsFileContents: '"using AdminService as service from \'../../srv/admin-service\';"',
            projectPath: 'testProject',
            appPath: 'webapp',
            projectName: 'annotations'
        };
        const annotationPath = join('./testProject/webapp/annotations', 'annotations.cds');

        // Write annotation file
        await updateCdsFilesWithAnnotations(annotationsInfo, fs);
        let annotationCds = fs.read(annotationPath);
        expect(annotationCds).toEqual(annotationsInfo.cdsFileContents);

        // Remove from annotation file
        await removeAnnotationsFromCDSFiles(annotationsInfo, fs);
        annotationCds = fs.read(annotationPath);
        expect(annotationCds).toEqual('');

        // Convert the annotation path to the services path
        const serviceCdsPath = join(dirname(annotationPath).replace('annotations', ''), 'services.cds');
        const serviceCds = fs.read(serviceCdsPath);
        expect(serviceCds).not.toContain(`using from './annotations/annotations';`);
    });

    it('removes from annotations cds files correctly for multiple annotations', async () => {
        const annotationsInfo: CdsAnnotationsInfo[] = [
            {
                cdsFileContents: '"using AdminService as service from \'../../srv/admin-service\';"',
                projectPath: 'testProject',
                appPath: 'webapp',
                projectName: 'annotations'
            },
            {
                cdsFileContents: '"using IncidentService as service from \'../../srv/incidentservice\';"',
                projectPath: 'testProject',
                appPath: 'webapp',
                projectName: 'annotations'
            }
        ];
        const annotationsPath = join('./testProject/webapp/annotations', 'annotations.cds');

        // Write annotation file
        await updateCdsFilesWithAnnotations(annotationsInfo, fs);
        let annotationCds = fs.read(annotationsPath);
        expect(annotationCds).toContain(annotationsInfo[0].cdsFileContents);
        expect(annotationCds).toContain(annotationsInfo[1].cdsFileContents);

        // Remove from annotation file
        await removeAnnotationsFromCDSFiles(annotationsInfo, fs);
        annotationCds = fs.read(annotationsPath);
        expect(annotationCds).not.toContain(annotationsInfo[0].cdsFileContents);
        expect(annotationCds).not.toContain(annotationsInfo[1].cdsFileContents);

        // Convert the annotation path to the services path
        const serviceCdsPath = join(dirname(annotationsPath).replace('annotations', ''), 'services.cds');
        const serviceCds = fs.read(serviceCdsPath);
        expect(serviceCds).not.toContain(`using from './annotations/annotations';`);
    });
});

describe('removeRemoteServiceAnnotationXmlFiles', () => {
    let fs: Editor;
    beforeEach(async () => {
        fs = create(createStorage());
    });

    it('removes service annotations', async () => {
        const serviceAnnotationPath = join('', 'webapp', 'localService', 'mainService', 'annotation1.xml');
        fs.write(serviceAnnotationPath, '<?xml version="1.0" encoding="utf-8"?></edmx:Edmx>');
        const differentServiceAnnotationPath = join(
            '',
            'webapp',
            'localService',
            'differentService',
            'annotation1.xml'
        );
        fs.write(differentServiceAnnotationPath, '<?xml version="1.0" encoding="utf-8"?></edmx:Edmx>');
        await removeRemoteServiceAnnotationXmlFiles(fs, '', 'mainService', [
            {
                name: 'annotation1',
                technicalName: 'annotation1',
                xml: '<?xml version="1.0" encoding="utf-8"?></edmx:Edmx>'
            }
        ]);
        expect(fs.exists(serviceAnnotationPath)).toBe(false);
        expect(fs.exists(differentServiceAnnotationPath)).toBe(true);
    });
});
