import { UIAnnotationTerms } from '@sap-ux/vocabularies-types/vocabularies/UI';
import type { Answers, DistinctChoice, ListChoiceMap } from 'inquirer';
import { create as createStorage } from 'mem-fs';
import type { Editor } from 'mem-fs-editor';
import { create } from 'mem-fs-editor';
import { join } from 'path';
import ProjectProvider from '../../../src/building-block/utils/project';
import {
    getAggregationPathPrompt,
    getAnnotationPathQualifierPrompt,
    getBindingContextTypePrompt,
    getBooleanPrompt,
    getBuildingBlockIdPrompt,
    getCAPServiceChoices,
    getCAPServicePrompt,
    getChoices,
    getEntityPrompt,
    getFilterBarIdListPrompt,
    getFilterBarIdPrompt,
    getViewOrFragmentFilePrompt
} from '../../../src/building-block/utils/prompts';
import {
    getAnnotationPathQualifiers,
    getAnnotationTermAlias,
    getEntityTypes
} from '../../../src/building-block/utils/service';
import * as projectAccess from '@sap-ux/project-access';

jest.setTimeout(10000);

const projectFolder = join(__dirname, '../sample/building-block/webapp-prompts');

jest.mock('@sap-ux/project-access', () => ({
    __esModule: true,
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    ...(jest.requireActual('@sap-ux/project-access') as object),
    getFileByExtension: jest
        .fn()
        .mockResolvedValue([
            join(__dirname, '../sample/building-block/webapp-prompts', 'webapp/ext/main', 'Main.view.xml')
        ]),
    getCapProjectType: jest.fn().mockResolvedValue('CAPNodejs'),
    loadModuleFromProject: jest.fn().mockResolvedValue({
        version: '5.5.5',
        home: '',
        env: {}
    }),
    getCapServiceName: jest.fn().mockResolvedValue('mappedMainServiceName')
}));

const ENTITY_TYPE = 'C_CUSTOMER_OP_SRV.C_CustomerOPType';
type Choices = (answers?: Answers) => Promise<readonly DistinctChoice<Answers, ListChoiceMap<Answers>>[]>;

describe('utils - ', () => {
    let projectProvider: ProjectProvider;
    let capProjectProvider: ProjectProvider;
    let fs: Editor;

    beforeAll(async () => {
        projectProvider = await ProjectProvider.createProject(projectFolder);
        fs = create(createStorage());
        capProjectProvider = await ProjectProvider.createProject(
            join(__dirname, '../sample/building-block/webapp-prompts-cap/app/incidents')
        );
    });

    describe('annotation service - ', () => {
        test('entityType', async () => {
            const entityTypes = await getEntityTypes(projectProvider);
            expect(entityTypes.length).toBe(30);
        });
        test('getAnnotationPathQualifiers - existing annotations', async () => {
            const annotationPathQualifiers = await getAnnotationPathQualifiers(projectProvider, ENTITY_TYPE, [
                UIAnnotationTerms.Chart,
                UIAnnotationTerms.LineItem,
                UIAnnotationTerms.SelectionFields
            ]);
            expect(annotationPathQualifiers).toMatchSnapshot();
        });
        test('getAnnotationPathQualifiers - non existing annotations', async () => {
            const annotationPathQualifiers = await getAnnotationPathQualifiers(projectProvider, '', [
                UIAnnotationTerms.SelectionVariant
            ]);
            expect(annotationPathQualifiers).toMatchObject({});
        });
        test('getAnnotationTermAlias', async () => {
            const alias = getAnnotationTermAlias(UIAnnotationTerms.LineItem).join('.');
            expect(alias).toBe('UI.LineItem');
        });
    });

    describe('prompts', () => {
        test('entityPrompt', async () => {
            let entityPrompt = getEntityPrompt('entity', projectProvider);
            expect(entityPrompt).toMatchSnapshot();
            expect(entityPrompt.choices).toBeDefined();
            const choices = await (entityPrompt.choices as Choices)();
            expect(choices).toMatchSnapshot();

            entityPrompt = getEntityPrompt('entity', { getXmlFiles: () => [] } as unknown as ProjectProvider);
            await expect(async () => await (entityPrompt.choices as Choices)()).rejects.toThrowError();
        });

        test('getChoices', async () => {
            let choices = getChoices(['test']);
            expect(choices).toMatchInlineSnapshot(`
                Array [
                  Object {
                    "name": "test",
                    "value": "test",
                  },
                ]
            `);

            choices = getChoices({ 'test': 'test' });
            expect(choices).toMatchInlineSnapshot(`
                Array [
                  Object {
                    "name": "test",
                    "value": "test",
                  },
                ]
            `);
        });

        test('getAnnotationPathQualifierPrompt', async () => {
            const annotationPathPrompt = getAnnotationPathQualifierPrompt(
                'testAnnotationPath',
                'testMessage',
                projectProvider,
                [UIAnnotationTerms.LineItem]
            );
            expect(annotationPathPrompt).toMatchSnapshot();
            const choicesProp = annotationPathPrompt.choices as Choices;
            expect(choicesProp).toBeDefined();
            const choices = await choicesProp({
                entity: ENTITY_TYPE
            });
            expect(choices).toMatchSnapshot();

            await expect(
                async () =>
                    await choicesProp({
                        entity: 'error'
                    })
            ).rejects.toThrowError();
        });

        test('getAggregationPathPrompt', async () => {
            const aggregationPathPrompt = getAggregationPathPrompt('AggregationPathMessage', fs);
            expect(aggregationPathPrompt).toMatchSnapshot();
            const choicesProp = aggregationPathPrompt.choices as Choices;
            expect(choicesProp).toBeDefined();
            let choices = await choicesProp({
                viewOrFragmentFile: join(projectFolder, 'webapp/ext/main/Main.view.xml')
            });
            expect(choices).toMatchSnapshot();

            choices = await choicesProp({
                viewOrFragmentFile: join(projectFolder, 'webapp/ext/main/Main.view.xml')
            });
            await expect(
                async () =>
                    await choicesProp({
                        viewOrFragmentFile: join(projectFolder, 'non-existing-file.xml')
                    })
            ).rejects.toThrow();
        });
        test('getViewOrFragmentFilePrompt', async () => {
            const viewOrFragmentFilePrompt = getViewOrFragmentFilePrompt(
                fs,
                projectFolder,
                'testMessage',
                'validationError'
            );
            expect(viewOrFragmentFilePrompt).toMatchSnapshot();
            const choicesProp = viewOrFragmentFilePrompt.choices as Choices;
            expect(choicesProp).toBeDefined();
            const choices = await choicesProp();
            expect(choices.length).toBe(1);

            const validateFn = viewOrFragmentFilePrompt.validate;
            expect(typeof validateFn).toBe('function');
            expect(validateFn?.('')).toBe('validationError');
            expect(validateFn?.('valid')).toBe(true);
        });

        test('getBindingContextType', async () => {
            const bindingContextPrompt = getBindingContextTypePrompt('bindingContext');
            expect(bindingContextPrompt).toMatchInlineSnapshot(`
                Object {
                  "additionalInfo": undefined,
                  "choices": Array [
                    Object {
                      "name": "Relative",
                      "value": "relative",
                    },
                    Object {
                      "name": "Absolute",
                      "value": "absolute",
                    },
                  ],
                  "default": undefined,
                  "groupId": undefined,
                  "message": "bindingContext",
                  "name": "bindingContextType",
                  "placeholder": undefined,
                  "required": undefined,
                  "selectType": "static",
                  "type": "list",
                }
            `);
        });
        test('getBooleanPrompt', async () => {
            const booleanPrompt = getBooleanPrompt('name', 'message');
            expect(booleanPrompt).toMatchInlineSnapshot(`
                Object {
                  "additionalInfo": undefined,
                  "choices": Array [
                    Object {
                      "name": "False",
                      "value": false,
                    },
                    Object {
                      "name": "True",
                      "value": true,
                    },
                  ],
                  "default": undefined,
                  "groupId": undefined,
                  "message": "message",
                  "name": "name",
                  "placeholder": undefined,
                  "required": undefined,
                  "selectType": "static",
                  "type": "list",
                }
            `);
        });
        test('getFilterBarIdPrompt', () => {
            const prompt = getFilterBarIdPrompt('message');
            expect(prompt).toMatchInlineSnapshot(`
                Object {
                  "additionalInfo": undefined,
                  "groupId": undefined,
                  "message": "message",
                  "name": "filterBar",
                  "placeholder": undefined,
                  "required": undefined,
                  "type": "input",
                }
            `);
        });

        test('getBuildingBlockIdPrompt', () => {
            const prompt = getBuildingBlockIdPrompt('message', 'error');
            expect(prompt).toMatchInlineSnapshot(`
                Object {
                  "additionalInfo": undefined,
                  "default": undefined,
                  "groupId": undefined,
                  "message": "message",
                  "name": "id",
                  "placeholder": "Enter a building block ID",
                  "required": undefined,
                  "type": "input",
                  "validate": [Function],
                }
            `);

            const validateFn = prompt.validate;
            expect(typeof validateFn).toBe('function');
            expect(validateFn?.('')).toBe('error');
        });

        test('getFilterBarIdListPrompt', () => {
            const prompt = getFilterBarIdListPrompt('message');
            expect(prompt).toMatchInlineSnapshot(`
                Object {
                  "additionalInfo": undefined,
                  "groupId": undefined,
                  "message": "message",
                  "name": "filterBarId",
                  "placeholder": "Select or enter a filter bar ID",
                  "required": undefined,
                  "selectType": "dynamic",
                  "type": "list",
                }
            `);
        });

        test.skip('getCAPServiceChoices', async () => {
            jest.spyOn(projectAccess, 'getProject').mockResolvedValue({
                apps: {
                    ['app\\incidents']: {
                        appRoot: '',
                        manifest: '',
                        changes: '',
                        services: { mainService: {} },
                        mainService: 'mainService'
                    } as unknown as projectAccess.ApplicationStructure
                },
                projectType: 'CAPNodejs',
                root: join(__dirname, '../sample/building-block/webapp-prompts-cap')
            });
            const choices = await getCAPServiceChoices(capProjectProvider);
            expect(choices).toMatchInlineSnapshot(`
                Array [
                  Object {
                    "name": "mappedMainServiceName",
                    "value": "mainService",
                  },
                ]
            `);
        });

        test.skip('getCAPServicePrompt', async () => {
            jest.spyOn(projectAccess, 'getProject').mockResolvedValue({
                apps: {
                    ['app\\incidents']: {
                        appRoot: '',
                        manifest: '',
                        changes: '',
                        services: { mainService: {} },
                        mainService: 'mainService'
                    } as unknown as projectAccess.ApplicationStructure
                },
                projectType: 'CAPNodejs',
                root: join(__dirname, '../sample/building-block/webapp-prompts-cap')
            });
            const prompt = await getCAPServicePrompt('message', capProjectProvider);
            expect(prompt).toMatchInlineSnapshot(`
                Object {
                  "additionalInfo": undefined,
                  "choices": Array [
                    Object {
                      "name": "mappedMainServiceName",
                      "value": "mainService",
                    },
                  ],
                  "default": "mainService",
                  "dependantPromptNames": undefined,
                  "groupId": undefined,
                  "message": "message",
                  "name": "service",
                  "placeholder": "Select a service",
                  "required": undefined,
                  "selectType": "dynamic",
                  "type": "list",
                }
            `);
        });
    });
});
