import { FioriElementsApp, LROPSettings, OdataVersion, TemplateType } from '../../src';
import { TemplateTypeAttributes } from '../../src/data/templateAttributes';
import { t } from '../../src/i18n';
import { ALPSettings } from '../../src/types';
import { validateApp, validateRequiredProperties } from '../../src/validate';
import { feBaseConfig, v4TemplateSettings } from '../common';

describe('Validate', () => {
    test('Valid app config', () => {
        const feApp: FioriElementsApp<LROPSettings> = {
            ...Object.assign(feBaseConfig('felrop1'), {
                template: {
                    type: TemplateType.ListReportObjectPage,
                    settings: {}
                },
                service: {
                    version: OdataVersion.v2
                }
            })
        } as FioriElementsApp<LROPSettings>;

        expect(() => validateApp(feApp)).not.toThrowError();
    });

    test('Invalid ODataVersion for template type', () => {
        const feApp: FioriElementsApp<LROPSettings> = {
            ...Object.assign(feBaseConfig('felrop1'), {
                template: {
                    type: TemplateType.Worklist,
                    settings: {}
                },
                service: {
                    version: OdataVersion.v4 // Worklist does not support v4
                }
            })
        } as FioriElementsApp<LROPSettings>;

        expect(() => validateApp(feApp)).toThrowError(
            t('error.unsupportedOdataVersion', {
                serviceVersion: feApp.service.version,
                templateType: feApp.template.type
            })
        );
    });

    test('Invalid semantic version specified', () => {
        let feApp: FioriElementsApp<LROPSettings> = {
            ...Object.assign(
                feBaseConfig('felrop1'),
                {
                    ui5: {
                        version: 'a.b.c',
                        minUI5Version: '1.60'
                    }
                },
                {
                    template: {
                        type: TemplateType.ListReportObjectPage,
                        settings: {}
                    },
                    service: {
                        version: OdataVersion.v2
                    }
                }
            )
        } as FioriElementsApp<LROPSettings>;

        expect(() => validateApp(feApp)).toThrowError(
            t('error.invalidUI5Version', {
                versionProperty: 'version',
                ui5Version: feApp.ui5?.version
            })
        );

        feApp = Object.assign(feApp, {
            ui5: {
                version: '1.1.1',
                minUI5Version: 'NOT.A.VALID.SEMVER'
            }
        });

        expect(() => validateApp(feApp)).toThrowError(
            t('error.invalidUI5Version', {
                versionProperty: 'minUI5Version',
                ui5Version: feApp.ui5?.minUI5Version
            })
        );
    });

    test('Invalid ui5 version for specified template type', () => {
        const feApp: FioriElementsApp<ALPSettings> = {
            ...Object.assign(
                feBaseConfig('felrop1'),
                {
                    ui5: {
                        version: '1.88.1',
                        minUI5Version: '1.92.0'
                    }
                },
                {
                    template: {
                        type: TemplateType.AnalyticalListPage,
                        settings: {}
                    },
                    service: {
                        version: OdataVersion.v4 // Worklist does not support v4
                    }
                }
            )
        } as FioriElementsApp<ALPSettings>;

        expect(() => validateApp(feApp)).toThrowError(
            t('error.unsupportedUI5Version', {
                versionProperty: 'version',
                ui5Version: feApp.ui5?.version,
                templateType: feApp.template.type,
                minRequiredUI5Version:
                    TemplateTypeAttributes[TemplateType.AnalyticalListPage].minimumUi5Version[OdataVersion.v4]
            })
        );
    });

    test('Invalid minimum ui5 version for specified template type', () => {
        const feApp: FioriElementsApp<ALPSettings> = {
            ...Object.assign(
                feBaseConfig('felrop1'),
                {
                    ui5: {
                        version: '1.92.0',
                        minUI5Version: '1.60.0'
                    }
                },
                {
                    template: {
                        type: TemplateType.AnalyticalListPage,
                        settings: {}
                    },
                    service: {
                        version: OdataVersion.v4 // Worklist does not support v4
                    }
                }
            )
        } as FioriElementsApp<ALPSettings>;

        expect(() => validateApp(feApp)).toThrowError(
            t('error.unsupportedUI5Version', {
                versionProperty: 'minUI5Version',
                ui5Version: feApp.ui5?.minUI5Version,
                templateType: feApp.template.type,
                minRequiredUI5Version:
                    TemplateTypeAttributes[TemplateType.AnalyticalListPage].minimumUi5Version[OdataVersion.v4]
            })
        );
    });

    test('Missing required property', () => {
        // Missing property: `FioriElementsApp.service`
        const feApp: FioriElementsApp<ALPSettings> = {
            ...Object.assign(
                feBaseConfig('felrop1'),
                {
                    ui5: {
                        version: '1.92.0',
                        minUI5Version: '1.60.0'
                    }
                },
                {
                    template: {
                        type: TemplateType.AnalyticalListPage,
                        settings: {}
                    }
                }
            )
        } as FioriElementsApp<ALPSettings>;

        expect(() => validateRequiredProperties(feApp)).toThrowError(
            t('error.missingRequiredProperty', {
                propertyName: 'FioriElementsApp.service'
            })
        );
    });
});
