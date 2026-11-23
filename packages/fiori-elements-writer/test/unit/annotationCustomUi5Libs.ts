import type { FioriElementsApp, LROPSettings } from '../../src/index.js';
import { OdataVersion, TemplateType } from '../../src/index.js';
import { feBaseConfig, getTestData } from '../common.js';
import { getAnnotationV4Libs } from '../../src/data/annotationCustomUi5Libs.js';
import { setAppDefaults } from '../../src/data/defaults.js';

describe('getAnnotationV4Libs', () => {
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

        setAppDefaults(feApp);
        expect(feApp.ui5?.customUi5Libs).toContain('sap.nw.core.gbt.notes.lib.reuse');
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

        setAppDefaults(feApp);
        expect(feApp.ui5?.customUi5Libs).not.toContain('sap.nw.core.gbt.notes.lib.reuse');
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

        setAppDefaults(feApp);
        expect(feApp.ui5?.customUi5Libs).not.toContain('sap.nw.core.gbt.notes.lib.reuse');
    });
});
