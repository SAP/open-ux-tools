import { getPrompts } from '../../../../src/prompts/add-annotations-to-odata/index';
import * as i18n from '../../../../src/i18n';
import * as projectAccess from '@sap-ux/project-access';
import type { ManifestNamespace } from '@sap-ux/project-access';
import * as validators from '@sap-ux/project-input-validator';
import * as fs from 'fs';

jest.mock('fs');
jest.mock('@sap-ux/project-input-validator');

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
                'localUri': 'localService/annotation.xml'
            }
        }
    } as Record<string, ManifestNamespace.DataSource>;
    const annotationFileSelectOptions = [
        { name: i18n.t('choices.annotationFile.selectFromWorkspace'), value: 1 },
        { name: i18n.t('choices.annotationFile.createTemplateFile'), value: 2 }
    ];

    beforeAll(async () => {
        await i18n.initI18n();
    });

    test('should return prompts with data sources', () => {
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
                guiType: 'file-browser',
                guiOptions: {
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

    test('should return prompts without data sources', () => {
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
                guiType: 'file-browser',
                guiOptions: {
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

    describe('file path validations', () => {
        test('should fail with input cannot be empty message', () => {
            jest.spyOn(validators, 'validateEmptyString').mockReturnValueOnce('Input cannot be empty');

            const filePathValidator = (getPrompts(mockBasePath, dataSources)[2] as any).validate;

            expect(filePathValidator('')).toBe('Input cannot be empty');
        });

        test('should fail with file doesn not exist message', () => {
            jest.spyOn(validators, 'validateEmptyString').mockReturnValueOnce(true);
            jest.spyOn(fs, 'existsSync').mockReturnValueOnce(false);

            const filePathValidator = (getPrompts(mockBasePath, dataSources)[2] as any).validate;

            expect(filePathValidator('non-existing-file.xml')).toBe(i18n.t('validators.fileDoesNotExist'));
        });

        test('should fail with file already exists in change directory message', () => {
            jest.spyOn(validators, 'validateEmptyString').mockReturnValueOnce(true);
            jest.spyOn(fs, 'existsSync').mockReturnValueOnce(true).mockReturnValueOnce(true);

            const filePathValidator = (getPrompts(mockBasePath, dataSources)[2] as any).validate;

            expect(filePathValidator('existing-file.xml')).toBe(i18n.t('validators.annotationFileAlreadyExists'));
        });

        test('should pass with relative file path input', () => {
            jest.spyOn(validators, 'validateEmptyString').mockReturnValueOnce(true);
            jest.spyOn(fs, 'existsSync').mockReturnValueOnce(true).mockReturnValueOnce(false);

            const filePathValidator = (getPrompts(mockBasePath, dataSources)[2] as any).validate;

            expect(filePathValidator('existing-file.xml')).toBeTruthy();
        });

        test('should pass with absolute file path input', () => {
            jest.spyOn(validators, 'validateEmptyString').mockReturnValueOnce(true);
            jest.spyOn(fs, 'existsSync').mockReturnValueOnce(true).mockReturnValueOnce(false);

            const filePathValidator = (getPrompts(mockBasePath, dataSources)[2] as any).validate;

            expect(filePathValidator('/path/to/file/existing-file.xml')).toBeTruthy();
        });
    });
});
