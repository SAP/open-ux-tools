import { ServiceType } from '@sap-ux/odata-service-writer';
import type { FioriElementsApp, LROPSettings } from '../../src';
import { OdataVersion, TemplateType } from '../../src';
import { feBaseConfig, getTestData } from '../common';
import { getAnnotationV4Libs } from '../../src/data/annotationReuseLibs';
import { getUi5Libs } from '../../src/data/defaults';

describe('getAnnotationLibs', () => {
    test('Metadata has the required annotation to return a Reuse lib', () => {
        const feApp: FioriElementsApp<LROPSettings> = {
            ...Object.assign(feBaseConfig('felrop1'), {
                template: {
                    type: TemplateType.ListReportObjectPage,
                    settings: {}
                },
                service: {
                    metadata: getTestData('annotation_v4', 'metadata'),
                    version: OdataVersion.v4
                }
            })
        } as FioriElementsApp<LROPSettings>;

        expect(getUi5Libs(feApp.template.type, feApp.service.version, feApp.service.metadata as string)).toContain(
            'sap.nw.core.gbt.notes.lib.reuse'
        );
    });

    test('Metadata does not contain the required annotation to return a Reuse lib', () => {
        const feApp: FioriElementsApp<LROPSettings> = {
            ...Object.assign(feBaseConfig('felrop1'), {
                template: {
                    type: TemplateType.ListReportObjectPage,
                    settings: {}
                },
                service: {
                    version: OdataVersion.v4,
                    metadata: ''
                }
            })
        } as FioriElementsApp<LROPSettings>;

        expect(getUi5Libs(feApp.template.type, feApp.service.version, feApp.service.metadata as string)).not.toContain(
            'sap.nw.core.gbt.notes.lib.reuse'
        );
        expect(getAnnotationV4Libs(feApp.service.metadata as string)).toEqual([]);
    });

    test('Unsupported OData version for annotation to return a Reuse lib', () => {
        const feApp: FioriElementsApp<LROPSettings> = {
            ...Object.assign(feBaseConfig('felrop1'), {
                template: {
                    type: TemplateType.ListReportObjectPage,
                    settings: {}
                },
                service: {
                    version: OdataVersion.v2,
                    metadata: getTestData('annotation_v4', 'metadata')
                }
            })
        } as FioriElementsApp<LROPSettings>;

        expect(getUi5Libs(feApp.template.type, feApp.service.version, feApp.service.metadata as string)).not.toContain(
            'sap.nw.core.gbt.notes.lib.reuse'
        );
    });
});
