import { ServiceType } from '@sap-ux/odata-service-writer';
import type { FioriElementsApp, LROPSettings } from '../../src';
import { OdataVersion } from '../../src';
import { feBaseConfig, getTestData } from '../common';
import { getAnnotationLibs } from '../../src/data/annotationReuseLibs';

describe('getAnnotationLibs', () => {
    test('Metadata has the required annotation to return a Reuse lib', () => {
        const feApp: FioriElementsApp<LROPSettings> = {
            ...Object.assign(feBaseConfig('felrop1'), {
                service: {
                    metadata: getTestData('annotation_v4', 'metadata') as string,
                    type: ServiceType.EDMX,
                    version: OdataVersion.v4
                }
            })
        } as FioriElementsApp<LROPSettings>;

        expect(getAnnotationLibs(feApp.service.version, feApp.service.metadata as string)).toEqual([
            'sap.nw.core.gbt.notes.lib.reuse'
        ]);
    });

    test('Metadata does not contain the required annotation to return a Reuse lib', () => {
        const feApp: FioriElementsApp<LROPSettings> = {
            ...Object.assign(feBaseConfig('felrop1'), {
                service: {
                    version: OdataVersion.v4,
                    metadata: ''
                }
            })
        } as FioriElementsApp<LROPSettings>;

        expect(getAnnotationLibs(feApp.service.version, feApp.service.metadata as string)).toEqual([]);
    });
});
