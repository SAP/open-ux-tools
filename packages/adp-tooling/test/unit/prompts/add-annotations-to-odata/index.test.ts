import { getPrompts } from '../../../../src/prompts/add-annotations-to-odata/index';
import * as i18n from '../../../../src/i18n';
import * as projectAccess from '@sap-ux/project-access';
import type { ManifestNamespace } from '@sap-ux/project-access';
import * as helper from '../../../../src/base/helper';

describe('getPrompts', () => {
    const mockBasePath = '/path/to/project';
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
    const annotationFileSelectOptions = [
        { name: i18n.t('choices.annotationFile.selectFromWorkspace'), value: 1 },
        { name: i18n.t('choices.annotationFile.createEmptyFile'), value: 2 }
    ];
    beforeAll(async () => {
        await i18n.initI18n();
    });
    test('return prompts', () => {
        const filteredDataSources = {
            'mainService': dataSources['mainService']
        };
        const dataSourceIds = Object.keys(filteredDataSources);
        jest.spyOn(projectAccess, 'filterDataSourcesByType').mockReturnValueOnce(filteredDataSources);

        const prompts = getPrompts(mockBasePath, dataSources);

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
                    hint: i18n.t('prompts.addAnnotationOdataSourceTooltip')
                }
            },
            {
                type: 'list',
                name: 'fileSelectOption',
                message: i18n.t('prompts.fileSelectOptionLabel'),
                choices: annotationFileSelectOptions,
                default: 0,
                guiOptions: {
                    mandatory: true,
                    hint: i18n.t('prompts.fileSelectOptionTooltip')
                },
                when: expect.any(Function)
            },
            {
                type: 'input',
                name: 'filePath',
                message: i18n.t('prompts.filePathLabel'),
                guiOptions: {
                    type: 'file-browser',
                    mandatory: true,
                    hint: i18n.t('prompts.filePathTooltip')
                },
                default: '',
                when: expect.any(Function),
                validate: expect.any(Function)
            }
        ]);
        const fileSelectOptionCondition = (prompts[1] as any).when;
        expect(fileSelectOptionCondition({ id: 'mainService' })).toBeTruthy();
        const filePathCondition = (prompts[2] as any).when;
        expect(filePathCondition({ id: 'mainService', fileSelectOption: 1 })).toBeTruthy();
    });
    test('return prompts - no data sources', () => {
        jest.spyOn(projectAccess, 'filterDataSourcesByType').mockReturnValueOnce({});

        const prompts = getPrompts(mockBasePath, {});

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
                    hint: i18n.t('prompts.addAnnotationOdataSourceTooltip')
                }
            },
            {
                type: 'list',
                name: 'fileSelectOption',
                message: i18n.t('prompts.fileSelectOptionLabel'),
                choices: annotationFileSelectOptions,
                default: 0,
                guiOptions: {
                    mandatory: true,
                    hint: i18n.t('prompts.fileSelectOptionTooltip')
                },
                when: expect.any(Function)
            },
            {
                type: 'input',
                name: 'filePath',
                message: i18n.t('prompts.filePathLabel'),
                guiOptions: {
                    type: 'file-browser',
                    mandatory: true,
                    hint: i18n.t('prompts.filePathTooltip')
                },
                default: '',
                when: expect.any(Function),
                validate: expect.any(Function)
            }
        ]);
        const fileSelectOptionCondition = (prompts[1] as any).when;
        expect(fileSelectOptionCondition({ id: '' })).toBeFalsy();
        const filePathCondition = (prompts[2] as any).when;
        expect(filePathCondition({ id: 'mainService', fileSelectOption: 2 })).toBeFalsy();
    });

    test('filePath validation - empty string', () => {
        jest.spyOn(helper, 'isNotEmptyString').mockReturnValueOnce(false);
        const filePathValidator = (getPrompts(mockBasePath, dataSources)[2] as any).validate;
        expect(filePathValidator('')).toBe(i18n.t('validators.cannotBeEmpty'));
    });
    test('filePath validation - file does not exist', () => {
        jest.spyOn(helper, 'isNotEmptyString').mockReturnValueOnce(true);
        jest.spyOn(helper, 'checkFileExists').mockReturnValueOnce(false);
        const filePathValidator = (getPrompts(mockBasePath, dataSources)[2] as any).validate;
        expect(filePathValidator('non-existing-file.xml')).toBe(i18n.t('validators.fileDoesNotExist'));
    });

    test('filePath validation - file is duplicate', () => {
        jest.spyOn(helper, 'isNotEmptyString').mockReturnValueOnce(true);
        jest.spyOn(helper, 'checkFileExists').mockReturnValueOnce(true);
        jest.spyOn(helper, 'checkDuplicateFile').mockReturnValueOnce(true);
        const filePathValidator = (getPrompts(mockBasePath, dataSources)[2] as any).validate;
        expect(filePathValidator('existing-file.xml')).toBe(i18n.t('validators.annotationFileAlreadyExists'));
    });
    test('filePath validation - relative path', () => {
        jest.spyOn(helper, 'isNotEmptyString').mockReturnValueOnce(true);
        jest.spyOn(helper, 'checkFileExists').mockReturnValueOnce(true);
        jest.spyOn(helper, 'checkDuplicateFile').mockReturnValueOnce(false);
        const filePathValidator = (getPrompts(mockBasePath, dataSources)[2] as any).validate;
        expect(filePathValidator('existing-file.xml')).toBeTruthy();
    });
    test('filePath validation - absolute path', () => {
        jest.spyOn(helper, 'isNotEmptyString').mockReturnValueOnce(true);
        jest.spyOn(helper, 'checkFileExists').mockReturnValueOnce(true);
        jest.spyOn(helper, 'checkDuplicateFile').mockReturnValueOnce(false);
        const filePathValidator = (getPrompts(mockBasePath, dataSources)[2] as any).validate;
        expect(filePathValidator('/path/to/file/existing-file.xml')).toBeTruthy();
    });
});
