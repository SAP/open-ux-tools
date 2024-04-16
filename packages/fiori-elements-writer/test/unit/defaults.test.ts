import type { LROPSettings } from '../../src';
import { OdataVersion, TemplateType } from '../../src';
import type { ALPSettings, ALPSettingsV2, ALPSettingsV4, Template } from '../../src/types';
import { TableSelectionMode, TableType } from '../../src/types';
import { setDefaultTemplateSettings } from '../../src/data/defaults';
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
                "tableType": "AnalyticalTable",
              },
            }
        `);

        expect(setDefaultTemplateSettings(cloneDeep(template), OdataVersion.v4)).toMatchInlineSnapshot(`
            Object {
              "entityConfig": Object {
                "mainEntityName": "",
                "tableType": "AnalyticalTable",
              },
              "selectionMode": "None",
            }
        `);

        expect(setDefaultTemplateSettings(cloneDeep(template), OdataVersion.v2)).toMatchInlineSnapshot(`
            Object {
              "autoHide": undefined,
              "entityConfig": Object {
                "mainEntityName": "",
                "tableType": "AnalyticalTable",
              },
              "multiSelect": undefined,
              "qualifier": undefined,
              "smartVariantManagement": undefined,
            }
        `);
    });

    test('Default specific template settings', () => {
        const templateALPv2: Template<ALPSettingsV2> = {
            type: TemplateType.AnalyticalListPage,
            settings: {
                entityConfig: {
                    mainEntityName: '',
                    tableType: TableType.GRID
                },
                autoHide: false,
                multiSelect: true
            }
        };

        expect(setDefaultTemplateSettings(cloneDeep(templateALPv2), OdataVersion.v2)).toMatchInlineSnapshot(`
            Object {
              "autoHide": false,
              "entityConfig": Object {
                "mainEntityName": "",
                "tableType": "GridTable",
              },
              "multiSelect": true,
              "qualifier": undefined,
              "smartVariantManagement": undefined,
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
                "tableType": "AnalyticalTable",
              },
              "selectionMode": "Multi",
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
