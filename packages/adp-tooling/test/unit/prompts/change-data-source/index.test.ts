import { getPrompts } from '../../../../src/prompts/change-data-source/index';
import * as i18n from '../../../../src/i18n';
import * as projectAccess from '@sap-ux/project-access';
import type { ManifestNamespace } from '@sap-ux/project-access';

describe('getPrompts', () => {
    const dataSources = {
        'mainService': {
            'uri': '/sap/opu/odata/main/service',
            'type': 'OData',
            'settings': {
                'annotations': ['secondService'],
                'localUri': 'localService/mockdata/metadata.xml'
            }
        },
        'secondService': {
            'uri': '/sap/opu/odata/second/service/',
            'type': 'ODataAnnotation',
            'settings': {
                'localUri': 'localService/annotation.xml'
            }
        }
    } as Record<string, ManifestNamespace.DataSource>;
    beforeAll(async () => {
        await i18n.initI18n();
    });
    test('return prompts', () => {
        const filteredDataSources = {
            'mainService': dataSources['mainService']
        };
        const dataSourceIds = Object.keys(filteredDataSources);
        jest.spyOn(projectAccess, 'filterDataSourcesByType').mockReturnValueOnce(filteredDataSources);

        const prompts = getPrompts(dataSources);

        expect(prompts).toEqual([
            {
                type: 'list',
                name: 'id',
                message: i18n.t('prompts.oDataSourceLabel'),
                choices: dataSourceIds,
                default: dataSourceIds[0],
                store: false,
                guiOptions: {
                    mandatory: true,
                    hint: i18n.t('prompts.oDataSourceTooltip')
                }
            },
            {
                type: 'input',
                name: 'uri',
                message: i18n.t('prompts.oDataSourceURILabel'),
                guiOptions: {
                    mandatory: true,
                    hint: i18n.t('prompts.oDataSourceURITooltip')
                },
                validate: expect.any(Function),
                when: true,
                store: false
            },
            {
                type: 'number',
                name: 'maxAge',
                message: i18n.t('prompts.maxAgeLabel'),
                guiOptions: {
                    hint: i18n.t('prompts.maxAgeTooltip')
                },
                when: expect.any(Function)
            },
            {
                type: 'input',
                name: 'annotationUri',
                message: i18n.t('prompts.oDataAnnotationSourceURILabel'),
                guiOptions: {
                    hint: i18n.t('prompts.oDataAnnotationSourceURITooltip')
                }
            }
        ]);
        const maxAgeCondition = (prompts[2] as any).when;
        expect(maxAgeCondition({ uri: 'uri' })).toBeTruthy();
    });
    test('return prompts - no data sources', () => {
        jest.spyOn(projectAccess, 'filterDataSourcesByType').mockReturnValueOnce({});

        const prompts = getPrompts({});

        expect(prompts).toEqual([
            {
                type: 'list',
                name: 'id',
                message: i18n.t('prompts.oDataSourceLabel'),
                choices: [],
                default: undefined,
                store: false,
                guiOptions: {
                    mandatory: true,
                    hint: i18n.t('prompts.oDataSourceTooltip')
                }
            },
            {
                type: 'input',
                name: 'uri',
                message: i18n.t('prompts.oDataSourceURILabel'),
                guiOptions: {
                    mandatory: true,
                    hint: i18n.t('prompts.oDataSourceURITooltip')
                },
                validate: expect.any(Function),
                when: false,
                store: false
            },
            {
                type: 'number',
                name: 'maxAge',
                message: i18n.t('prompts.maxAgeLabel'),
                guiOptions: {
                    hint: i18n.t('prompts.maxAgeTooltip')
                },
                when: expect.any(Function)
            },
            {
                type: 'input',
                name: 'annotationUri',
                message: i18n.t('prompts.oDataAnnotationSourceURILabel'),
                guiOptions: {
                    hint: i18n.t('prompts.oDataAnnotationSourceURITooltip')
                }
            }
        ]);
        const maxAgeCondition = (prompts[2] as any).when;
        expect(maxAgeCondition({ uri: '' })).toBeFalsy();
    });
});
