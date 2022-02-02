import { readFile } from 'fs-extra';
import { join } from 'path';
import { getAnnotationNamespaces } from '../../src/data/annotations';
import { t } from '../../src/i18n';

describe('metadata parsing', () => {
    let testDataPath,
        metadata,
        annotationsMultipleRef,
        annotationSingleRef,
        multischemaMetadata,
        invalidEdmx,
        missingSchema;

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
        }).toThrow(t('error.unparseableXML'));
        expect(getAnnotationNamespaces({ metadata: missingSchema })).toEqual([]);

        expect(getAnnotationNamespaces({ metadata: multischemaMetadata })).toEqual([
            { namespace: 'SEPMRA_PROD_MAN', alias: '' },
            { namespace: 'SEPMRA_PROD_MAN_1', alias: '' }
        ]);
        expect(getAnnotationNamespaces({ metadata })).toEqual([{ namespace: 'SEPMRA_PROD_MAN', alias: '' }]);
    });

    it('getAnnotationNamespaces: annotations alias parsing', () => {
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
