import { UIAnnotationTerms } from '@sap-ux/vocabularies-types/vocabularies/UI';
import type { Answers, DistinctChoice, ListChoiceMap } from 'inquirer';
import { create as createStorage } from 'mem-fs';
import type { Editor } from 'mem-fs-editor';
import { create } from 'mem-fs-editor';
import { join } from 'path';
import {
    getAggregationPathPrompt,
    getAnnotationPathQualifierPrompt,
    getBindingContextTypePrompt,
    getBooleanPrompt,
    getBuildingBlockIdPrompt,
    getCAPServiceChoices,
    getCAPServicePrompt,
    transformChoices,
    getEntityPrompt,
    getFilterBarIdPrompt,
    getViewOrFragmentPathPrompt,
    ProjectProvider,
    getAnnotationPathQualifiers,
    getAnnotationTermAlias,
    getEntityTypes
} from '../../../src/building-block/prompts/utils';
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

        test('getAnnotationPathQualifiers - existing annotations, absolute binding context path', async () => {
            const annotationPathQualifiers = await getAnnotationPathQualifiers(
                projectProvider,
                ENTITY_TYPE,
                [UIAnnotationTerms.Chart, UIAnnotationTerms.LineItem, UIAnnotationTerms.SelectionFields],
                { type: 'absolute' }
            );
            expect(annotationPathQualifiers).toMatchSnapshot();
        });

        test('getAnnotationPathQualifiers - non existing annotations, absolute binding context path', async () => {
            const annotationPathQualifiers = await getAnnotationPathQualifiers(
                projectProvider,
                '',
                [UIAnnotationTerms.SelectionVariant],
                { type: 'absolute' }
            );
            expect(annotationPathQualifiers).toMatchObject({});
        });

        test('getAnnotationPathQualifiers - existing annotations, relative binding context path', async () => {
            const annotationPathQualifiers = await getAnnotationPathQualifiers(
                projectProvider,
                ENTITY_TYPE,
                [UIAnnotationTerms.Chart, UIAnnotationTerms.LineItem, UIAnnotationTerms.SelectionFields],
                { type: 'relative' }
            );
            expect(annotationPathQualifiers).toMatchSnapshot();
        });

        test('getAnnotationPathQualifiers - non existing annotations, relative binding context path', async () => {
            const annotationPathQualifiers = await getAnnotationPathQualifiers(
                projectProvider,
                '',
                [UIAnnotationTerms.SelectionVariant],
                { type: 'relative' }
            );
            expect(annotationPathQualifiers).toMatchObject({});
        });

        test('getAnnotationPathQualifiers - existing annotations, relative binding context path, filter isCollection', async () => {
            const annotationPathQualifiers = await getAnnotationPathQualifiers(
                projectProvider,
                ENTITY_TYPE,
                [UIAnnotationTerms.LineItem],
                { type: 'relative', isCollection: true }
            );
            expect(annotationPathQualifiers).toMatchSnapshot();
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

        test('transformChoices', async () => {
            let choices = transformChoices(['test']);
            expect(choices).toMatchInlineSnapshot(`
                Array [
                  "test",
                ]
            `);

            choices = transformChoices({ 'test': 'test' });
            expect(choices).toMatchInlineSnapshot(`
                Array [
                  Object {
                    "name": "test",
                    "value": "test",
                  },
                ]
            `);

            choices = transformChoices(['b', 'a'], false); // preserve order
            expect(choices).toMatchInlineSnapshot(`
                Array [
                  "b",
                  "a",
                ]
            `);

            choices = transformChoices({ 'b': 'b', 'a': 'a' }, false); // preserve order
            expect(choices).toMatchInlineSnapshot(`
                Array [
                  Object {
                    "name": "b",
                    "value": "b",
                  },
                  Object {
                    "name": "a",
                    "value": "a",
                  },
                ]
            `);

            choices = transformChoices(['a', 'a'], false); // filter duplicates
            expect(choices).toMatchInlineSnapshot(`
                Array [
                  "a",
                ]
            `);
        });

        test('getAnnotationPathQualifierPrompt', async () => {
            const annotationPathPrompt = getAnnotationPathQualifierPrompt('testMessage', projectProvider, [
                UIAnnotationTerms.LineItem
            ]);
            expect(annotationPathPrompt).toMatchSnapshot();
            const choicesProp = annotationPathPrompt.choices as Choices;
            expect(choicesProp).toBeDefined();
            const choices = await choicesProp({
                buildingBlockData: {
                    metaPath: {
                        entitySet: ENTITY_TYPE
                    }
                }
            });
            expect(choices).toMatchSnapshot();

            await expect(
                async () =>
                    await choicesProp({
                        buildingBlockData: {
                            metaPath: {
                                entitySet: 'error'
                            }
                        }
                    })
            ).rejects.toThrowError();
        });

        test('getAggregationPathPrompt', async () => {
            const aggregationPathPrompt = getAggregationPathPrompt('AggregationPathMessage', fs, projectFolder);
            expect(aggregationPathPrompt).toMatchSnapshot();
            const choicesProp = aggregationPathPrompt.choices as Choices;
            expect(choicesProp).toBeDefined();
            let choices = await choicesProp({
                viewOrFragmentPath: join('webapp/ext/main/Main.view.xml')
            });
            expect(choices).toMatchSnapshot();

            choices = await choicesProp({
                viewOrFragmentPath: join('webapp/ext/main/Main.view.xml')
            });
            await expect(
                async () =>
                    await choicesProp({
                        viewOrFragmentPath: join('non-existing-file.xml')
                    })
            ).rejects.toThrow();
        });
        test('getViewOrFragmentPathPrompt', async () => {
            const viewOrFragmentPathPrompt = getViewOrFragmentPathPrompt(
                fs,
                projectFolder,
                'testMessage',
                'validationError'
            );
            expect(viewOrFragmentPathPrompt).toMatchSnapshot();
            const choicesProp = viewOrFragmentPathPrompt.choices as Choices;
            expect(choicesProp).toBeDefined();
            const choices = await choicesProp();
            expect(choices.length).toBe(1);

            const validateFn = viewOrFragmentPathPrompt.validate;
            expect(typeof validateFn).toBe('function');
            expect(validateFn?.('')).toBe('validationError');
            expect(validateFn?.('valid')).toBe(true);
        });

        test('getBindingContextType', async () => {
            const bindingContextPrompt = getBindingContextTypePrompt('bindingContext');
            expect(bindingContextPrompt).toMatchInlineSnapshot(`
                Object {
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
                  "dependantPromptNames": Array [
                    "buildingBlockData.metaPath.qualifier",
                  ],
                  "message": "bindingContext",
                  "name": "bindingContextType",
                  "selectType": "static",
                  "type": "list",
                }
            `);
        });
        test('getBooleanPrompt', async () => {
            const booleanPrompt = getBooleanPrompt('name', 'message');
            expect(booleanPrompt).toMatchInlineSnapshot(`
                Object {
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
                  "message": "message",
                  "name": "name",
                  "selectType": "static",
                  "type": "list",
                }
            `);
        });
        test('getFilterBarIdPrompt - input type', () => {
            const prompt = getFilterBarIdPrompt('message', 'input');
            expect(prompt).toMatchInlineSnapshot(`
                Object {
                  "message": "message",
                  "name": "buildingBlockData.filterBar",
                  "placeholder": "Enter a new filter bar ID",
                  "type": "input",
                }
            `);
        });

        test('getBuildingBlockIdPrompt', async () => {
            const prompt = getBuildingBlockIdPrompt(fs, 'message', 'error', projectFolder);
            expect(prompt).toMatchInlineSnapshot(`
                Object {
                  "default": undefined,
                  "message": "message",
                  "name": "buildingBlockData.id",
                  "placeholder": "Enter a building block ID",
                  "type": "input",
                  "validate": [Function],
                }
            `);

            const validateFn = prompt.validate;
            expect(typeof validateFn).toBe('function');
            expect(await validateFn?.('')).toBe('error');
        });

        test('getFilterBarIdPrompt - list type', () => {
            const prompt = getFilterBarIdPrompt('message', 'list', fs, projectFolder, {
                placeholder: 'Select or enter a filter bar ID',
                creation: { inputPlaceholder: 'Enter a new filter bar ID' }
            });
            expect(prompt).toMatchInlineSnapshot(`
                Object {
                  "choices": [Function],
                  "creation": Object {
                    "inputPlaceholder": "Enter a new filter bar ID",
                  },
                  "message": "message",
                  "name": "buildingBlockData.filterBar",
                  "placeholder": "Select or enter a filter bar ID",
                  "selectType": "dynamic",
                  "type": "list",
                }
            `);
        });

        test('getCAPServiceChoices', async () => {
            jest.spyOn(projectAccess, 'getProject').mockResolvedValue({
                apps: {
                    [join('app/incidents')]: {
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

        test('getCAPServicePrompt', async () => {
            jest.spyOn(projectAccess, 'getProject').mockResolvedValue({
                apps: {
                    [join('app/incidents')]: {
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
                  "choices": [Function],
                  "default": "mainService",
                  "dependantPromptNames": undefined,
                  "message": "message",
                  "name": "service",
                  "placeholder": "Select a service",
                  "selectType": "dynamic",
                  "type": "list",
                }
            `);
        });
    });
});
