import { readFileSync } from 'fs-extra';
import { join } from 'path';
import { getAnnotationNamespaces } from '../../src/data/annotations';
import { t } from '../../src/i18n';

const metadata = readFileSync(join(__dirname, '../test-data/metadata_test/metadata.xml')).toString();
const annotations = readFileSync(join(__dirname, '../test-data/sepmra_prod_man_v2/annotations.xml')).toString();
const multischemaMetadata = readFileSync(join(__dirname, '../test-data/metadata_test/multiple_schemas.xml')).toString();
const invalidEdmx = readFileSync(join(__dirname, '../test-data/metadata_test/bad_metadata.xml')).toString();

describe('metadata parsing', () => {
    it('getAnnotationNamespaces: metadata parsing', () => {
        expect(() => { getAnnotationNamespaces({ metadata: invalidEdmx })}).toThrow(t('error.invalidXML'));
        expect(getAnnotationNamespaces({ metadata: multischemaMetadata })).toEqual([
            { namespace: 'SEPMRA_PROD_MAN', alias: '' },
            { namespace: 'SEPMRA_PROD_MAN_1', alias: '' }
        ]);
        expect(getAnnotationNamespaces({ metadata })).toEqual([{ namespace: 'SEPMRA_PROD_MAN', alias: '' }]);
    });

    it('getAnnotationNamespaces: alias parsing', () => {
        expect(
            getAnnotationNamespaces({
                metadata: multischemaMetadata,
                annotations: { technicalName: 'TEST_ANNOTATIONS', xml: annotations }
            })
        ).toEqual([
            { namespace: 'SEPMRA_PROD_MAN', alias: 'SAP' },
            { namespace: 'SEPMRA_PROD_MAN_1', alias: '' }
        ]);
        expect(
            getAnnotationNamespaces({ metadata, annotations: { technicalName: 'TEST_ANNOTATIONS', xml: annotations } })
        ).toEqual([{ namespace: 'SEPMRA_PROD_MAN', alias: 'SAP' }]);
    });
});
