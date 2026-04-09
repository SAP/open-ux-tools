import { jest } from '@jest/globals';
import type { ManifestNamespace } from '@sap-ux/project-access';

// Pre-load actuals
const actualFs = await import('node:fs');
const actualProjectAccess = await import('@sap-ux/project-access');
const actualValidators = await import('@sap-ux/project-input-validator');

// Create mocks
const mockFilterDataSourcesByType = jest.fn();
const mockExistsSync = jest.fn<typeof actualFs.existsSync>();
const mockValidateEmptyString = jest.fn<(...args: unknown[]) => unknown>().mockReturnValue(true);

jest.unstable_mockModule('node:fs', () => ({
    ...actualFs,
    existsSync: mockExistsSync,
    default: { ...actualFs.default, existsSync: mockExistsSync }
}));

jest.unstable_mockModule('@sap-ux/project-access', () => ({
    ...actualProjectAccess,
    filterDataSourcesByType: mockFilterDataSourcesByType
}));

jest.unstable_mockModule('@sap-ux/project-input-validator', () => ({
    ...actualValidators,
    validateEmptyString: mockValidateEmptyString
}));

const { getPrompts } = await import('../../../../src/prompts/add-annotations-to-odata/index');
const i18n = await import('../../../../src/i18n');

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

    beforeEach(() => {
        jest.clearAllMocks();
        mockValidateEmptyString.mockReturnValue(true);
    });

    test('should return prompts with data sources', () => {
        const filteredDataSources = {
            'mainService': dataSources['mainService']
        };
        const dataSourceIds = Object.keys(filteredDataSources);
        mockFilterDataSourcesByType.mockReturnValueOnce(filteredDataSources);

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
        mockFilterDataSourcesByType.mockReturnValueOnce({});

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
        test('should fail with input cannot be empty message', async () => {
            mockValidateEmptyString.mockReturnValueOnce('Input cannot be empty');

            const filePathValidator = (getPrompts(mockBasePath, dataSources)[2] as any).validate as Function;

            expect(await filePathValidator('')).toBe('Input cannot be empty');
        });

        test('should fail with file doesn not exist message', async () => {
            mockValidateEmptyString.mockReturnValueOnce(true);
            mockExistsSync.mockReturnValueOnce(false);

            const filePathValidator = (getPrompts(mockBasePath, dataSources)[2] as any).validate as Function;

            expect(await filePathValidator('non-existing-file.xml')).toBe(i18n.t('validators.fileDoesNotExist'));
        });

        test('should fail with file already exists in change directory message', async () => {
            mockValidateEmptyString.mockReturnValueOnce(true);
            mockExistsSync.mockReturnValueOnce(true).mockReturnValueOnce(true);

            const filePathValidator = (getPrompts(mockBasePath, dataSources)[2] as any).validate as Function;

            expect(await filePathValidator('existing-file.xml')).toBe(i18n.t('validators.annotationFileAlreadyExists'));
        });

        test('should pass with relative file path input', async () => {
            mockValidateEmptyString.mockReturnValueOnce(true);
            mockExistsSync.mockReturnValueOnce(true).mockReturnValueOnce(false);

            const filePathValidator = (getPrompts(mockBasePath, dataSources)[2] as any).validate as Function;

            expect(await filePathValidator('existing-file.xml')).toBeTruthy();
        });

        test('should pass with absolute file path input', () => {
            mockValidateEmptyString.mockReturnValueOnce(true);
            mockExistsSync.mockReturnValueOnce(true).mockReturnValueOnce(false);

            const filePathValidator = (getPrompts(mockBasePath, dataSources)[2] as any).validate;

            expect(filePathValidator('/path/to/file/existing-file.xml')).toBeTruthy();
        });
    });
});
