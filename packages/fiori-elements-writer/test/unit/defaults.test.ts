import { FioriElementsApp, LROPSettings, OdataVersion, TemplateType } from '../../src';
import { t } from '../../src/i18n';
import { ALPSettings, ALPSettingsV2, ALPSettingsV4, TableSelectionMode, TableType, Template } from '../../src/types';
import { setAppDefaults, setDefaultTemplateSettings } from '../../src/data/defaults';
import { feBaseConfig, v4TemplateSettings } from '../common';
import cloneDeep from 'lodash/cloneDeep';

describe('Defaults', () => {
    test('Default all template settings', () => {
        const template: Template<ALPSettings> = {
            type: TemplateType.AnalyticalListPage,
            settings: {
                entityConfig: {
                    mainEntityName: ''
                }
            }
        };

        expect(setDefaultTemplateSettings(cloneDeep(template))).toMatchInlineSnapshot(`
            Object {
              "entityConfig": Object {
                "mainEntityName": "",
              },
              "tableType": "AnalyticalTable",
            }
        `);

        expect(setDefaultTemplateSettings(cloneDeep(template), OdataVersion.v4)).toMatchInlineSnapshot(`
            Object {
              "entityConfig": Object {
                "mainEntityName": "",
              },
              "selectionMode": "None",
              "tableType": "AnalyticalTable",
            }
        `);

        expect(setDefaultTemplateSettings(cloneDeep(template), OdataVersion.v2)).toMatchInlineSnapshot(`
            Object {
              "autoHide": undefined,
              "entityConfig": Object {
                "mainEntityName": "",
              },
              "multiSelect": undefined,
              "qualifier": undefined,
              "smartVariantManagement": undefined,
              "tableType": "AnalyticalTable",
            }
        `);
    });

    test('Default specific template settings', () => {
        const templateALPv2: Template<ALPSettingsV2> = {
            type: TemplateType.AnalyticalListPage,
            settings: {
                entityConfig: {
                    mainEntityName: ''
                },
                autoHide: false,
                multiSelect: true,
                tableType: TableType.GRID
            }
        };

        expect(setDefaultTemplateSettings(cloneDeep(templateALPv2), OdataVersion.v2)).toMatchInlineSnapshot(`
            Object {
              "autoHide": false,
              "entityConfig": Object {
                "mainEntityName": "",
              },
              "multiSelect": true,
              "qualifier": undefined,
              "smartVariantManagement": undefined,
              "tableType": "GridTable",
            }
        `);

        const templateALPv4: Template<ALPSettingsV4> = {
            type: TemplateType.AnalyticalListPage,
            settings: {
                entityConfig: {
                    mainEntityName: ''
                },
                selectionMode: TableSelectionMode.MULTI
            }
        };

        expect(setDefaultTemplateSettings(cloneDeep(templateALPv4), OdataVersion.v4)).toMatchInlineSnapshot(`
            Object {
              "entityConfig": Object {
                "mainEntityName": "",
              },
              "selectionMode": "Multi",
              "tableType": "AnalyticalTable",
            }
        `);

        const templateLROP: Template<LROPSettings> = {
            type: TemplateType.ListReportObjectPage,
            settings: {
                entityConfig: {
                    mainEntityName: ''
                }
            }
        };

        expect(setDefaultTemplateSettings(cloneDeep(templateLROP))).toMatchInlineSnapshot(`
            Object {
              "entityConfig": Object {
                "mainEntityName": "",
              },
            }
        `);
    });
});
