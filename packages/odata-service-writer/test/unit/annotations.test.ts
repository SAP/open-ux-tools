import { readFileSync } from 'fs-extra';
import { join } from 'path';
import { getAnnotationNamespaces } from '../../src/data/annotations';
import { t } from '../../src/i18n';

const testDataPath = join(__dirname, '../test-data/annotations-test');
const metadata = readFileSync(join(testDataPath, 'metadata.xml')).toString();
const annotationsMultipleRef = readFileSync(join(testDataPath, 'annotations_multiple_refs.xml')).toString();
const annotationSingleRef = readFileSync(join(testDataPath, 'annotations_single_ref.xml')).toString();
const multischemaMetadata = readFileSync(join(testDataPath, 'multiple_schemas.xml')).toString();
const invalidEdmx = readFileSync(join(testDataPath, 'bad_metadata.xml')).toString();
const missingSchema = readFileSync(join(testDataPath, 'missing_schema.xml')).toString();

describe('metadata parsing', () => {
    it('getAnnotationNamespaces: metadata parsing', () => {
        expect(() => {
            getAnnotationNamespaces({ metadata: invalidEdmx });
        }).toThrow(t('error.invalidXML'));
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
