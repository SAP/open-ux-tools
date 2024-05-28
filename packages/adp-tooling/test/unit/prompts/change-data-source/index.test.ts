import { getPrompts } from '../../../../src/prompts/change-data-source/index';
import * as i18n from '../../../../src/i18n';
import * as utils from '../../../../src/prompts/utils';
import type { ManifestNamespace } from '@sap-ux/project-access';

describe('getPrompts', () => {
    // Mock data
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
                'localUri': 'localService/SEPMRA_PROD_MAN_ANNO_MDL.xml'
            }
        }
    } as Record<string, ManifestNamespace.DataSource>;
    beforeAll(async () => {
        await i18n.initI18n();
    });
    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(i18n, 't')
            .mockReturnValueOnce('oDataSourceLabel')
            .mockReturnValueOnce('oDataSourceTooltip')
            .mockReturnValueOnce('oDataSourceURILabel')
            .mockReturnValueOnce('oDataSourceURITooltip')
            .mockReturnValueOnce('maxAgeLabel')
            .mockReturnValueOnce('oDataAnnotationSourceURILabel')
            .mockReturnValueOnce('oDataAnnotationSourceURITooltip');
    });
    afterEach(() => {
        jest.restoreAllMocks();
    });
    test('return prompts', () => {
        const dataSourceIds = ['mainService'];
        jest.spyOn(utils, 'getDataSourceIds').mockReturnValueOnce(dataSourceIds);

        const prompts = getPrompts(dataSources);

        expect(prompts).toEqual([
            {
                type: 'list',
                name: 'id',
                message: 'oDataSourceLabel',
                choices: dataSourceIds,
                default: dataSourceIds[0],
                store: false,
                guiOptions: {
                    mandatory: true,
                    hint: 'oDataSourceTooltip'
                }
            },
            {
                type: 'input',
                name: 'uri',
                message: 'oDataSourceURILabel',
                guiOptions: {
                    mandatory: true,
                    hint: 'oDataSourceURITooltip'
                },
                validate: expect.any(Function),
                when: true,
                store: false
            },
            {
                type: 'number',
                name: 'maxAge',
                message: 'maxAgeLabel',
                when: expect.any(Function)
            },
            {
                type: 'input',
                name: 'annotationUri',
                message: 'oDataAnnotationSourceURILabel',
                guiOptions: {
                    hint: 'oDataAnnotationSourceURITooltip'
                }
            }
        ]);
        const maxAgeCondition = (prompts[2] as any).when;
        expect(maxAgeCondition({ uri: 'uri' })).toBeTruthy();
    });
    test('return prompts - no data sources', () => {
        const dataSourceIds: string[] = [];
        jest.spyOn(utils, 'getDataSourceIds').mockReturnValueOnce(dataSourceIds);

        const prompts = getPrompts({});

        expect(prompts).toEqual([
            {
                type: 'list',
                name: 'id',
                message: 'oDataSourceLabel',
                choices: [],
                default: undefined,
                store: false,
                guiOptions: {
                    mandatory: true,
                    hint: 'oDataSourceTooltip'
                }
            },
            {
                type: 'input',
                name: 'uri',
                message: 'oDataSourceURILabel',
                guiOptions: {
                    mandatory: true,
                    hint: 'oDataSourceURITooltip'
                },
                validate: expect.any(Function),
                when: false,
                store: false
            },
            {
                type: 'number',
                name: 'maxAge',
                message: 'maxAgeLabel',
                when: expect.any(Function)
            },
            {
                type: 'input',
                name: 'annotationUri',
                message: 'oDataAnnotationSourceURILabel',
                guiOptions: {
                    hint: 'oDataAnnotationSourceURITooltip'
                }
            }
        ]);
        const maxAgeCondition = (prompts[2] as any).when;
        expect(maxAgeCondition({ uri: '' })).toBeFalsy();
    });
});
