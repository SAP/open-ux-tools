import { UIAnnotationTerms } from '@sap-ux/vocabularies-types/vocabularies/UI';
import type { Answers, DistinctChoice, ListChoiceMap } from 'inquirer';
import { create as createStorage } from 'mem-fs';
import type { Editor } from 'mem-fs-editor';
import { create } from 'mem-fs-editor';
import { join } from 'path';
import { getProject } from '@sap-ux/project-access';
import type { Project } from '@sap-ux/project-access';
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
    getAnnotationPathQualifiers,
    getAnnotationTermAlias,
    getEntityTypes,
    getMappedServiceName
} from '../../../src/building-block/prompts/utils';
import { FioriAnnotationService } from '@sap-ux/fiori-annotation-api';
import { testSchema } from '../sample/building-block/webapp-prompts-cap/schema';
import type { ListPromptQuestion, PromptContext } from '../../../src/building-block/prompts/types';

jest.setTimeout(10000);

const projectFolder = join(__dirname, '../sample/building-block/webapp-prompts');
const capProjectFolder = join(__dirname, '../sample/building-block/webapp-prompts-cap');
const capAppFolder = join('app/incidents');

const ENTITY_TYPE = 'C_CUSTOMER_OP_SRV.C_CustomerOPType';
type Choices = (answers?: Answers) => Promise<readonly DistinctChoice<Answers, ListChoiceMap<Answers>>[]>;

jest.mock('@sap-ux/project-access', () => ({
    __esModule: true,
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    ...(jest.requireActual('@sap-ux/project-access') as object),
    getCapModelAndServices: jest.fn().mockResolvedValue({
        model: {},
        services: [],
        cdsVersionInfo: { home: '', version: '', root: '' }
    }),
    getCapServiceName: jest.fn().mockResolvedValue('mappedMainServiceName')
}));

describe('utils - ', () => {
    let project: Project;
    let capProject: Project;
    let fs: Editor;
    let context: PromptContext;

    beforeAll(async () => {
        project = await getProject(projectFolder);
        capProject = await getProject(capProjectFolder);
        fs = create(createStorage());
        context = {
            fs,
            appId: '',
            appPath: projectFolder,
            project
        };
    });

    describe('annotation service - ', () => {
        test('entityType', async () => {
            const entityTypes = await getEntityTypes(project, '');
            expect(entityTypes.length).toBe(30);
        });

        test('entityType - CAP', async () => {
            jest.spyOn(FioriAnnotationService, 'createService').mockResolvedValueOnce({
                sync: jest.fn(),
                getSchema: () => ({
                    identification: '',
                    version: '',
                    references: [],
                    schema: testSchema
                })
            } as unknown as FioriAnnotationService);
            const entityTypes = await getEntityTypes(capProject, capAppFolder);
            expect(entityTypes.length).toBe(11);
        });

        test('getMappedServiceName - CAP', async () => {
            expect(await getMappedServiceName(capProject, 'mainService', capAppFolder)).toBe('mappedMainServiceName');
        });

        test('getMappedServiceName - CAP, appId = undefined', async () => {
            expect(await getMappedServiceName(capProject, 'mainService', undefined!)).toBe('mappedMainServiceName');
        });

        test('getMappedServiceName - CAP, no app for appId found throws error', async () => {
            await expect(getMappedServiceName(capProject, 'mainService', 'invalidAppId')).rejects.toThrow(
                'ERROR_INVALID_APP_ID'
            );
        });

        test('getAnnotationPathQualifiers - existing annotations, absolute binding context path', async () => {
            const annotationPathQualifiers = await getAnnotationPathQualifiers(
                project,
                '',
                ENTITY_TYPE,
                [UIAnnotationTerms.Chart, UIAnnotationTerms.LineItem, UIAnnotationTerms.SelectionFields],
                { type: 'absolute' }
            );
            expect(annotationPathQualifiers).toMatchSnapshot();
        });

        test('getAnnotationPathQualifiers - existing annotations for EntitySet, absolute binding context path', async () => {
            const annotationPathQualifiers = await getAnnotationPathQualifiers(
                project,
                '',
                'C_CustomerBankDetailsOP',
                [UIAnnotationTerms.Chart, UIAnnotationTerms.LineItem, UIAnnotationTerms.SelectionFields],
                { type: 'absolute' }
            );
            expect(annotationPathQualifiers).toMatchSnapshot();
        });

        test('getAnnotationPathQualifiers - existing annotations, absolute binding context path, use namespace', async () => {
            const annotationPathQualifiers = await getAnnotationPathQualifiers(
                project,
                '',
                ENTITY_TYPE,
                [UIAnnotationTerms.Chart, UIAnnotationTerms.LineItem, UIAnnotationTerms.SelectionFields],
                { type: 'absolute' },
                true
            );
            expect(annotationPathQualifiers).toMatchSnapshot();
        });

        test('getAnnotationPathQualifiers - non existing annotations, absolute binding context path', async () => {
            const annotationPathQualifiers = await getAnnotationPathQualifiers(
                project,
                '',
                '',
                [UIAnnotationTerms.SelectionVariant],
                { type: 'absolute' }
            );
            expect(annotationPathQualifiers).toMatchObject({});
        });

        test('getAnnotationPathQualifiers - existing annotations, relative binding context path', async () => {
            const annotationPathQualifiers = await getAnnotationPathQualifiers(
                project,
                '',
                ENTITY_TYPE,
                [UIAnnotationTerms.Chart, UIAnnotationTerms.LineItem, UIAnnotationTerms.SelectionFields],
                { type: 'relative' }
            );
            expect(annotationPathQualifiers).toMatchSnapshot();
        });

        test('getAnnotationPathQualifiers - non existing annotations, relative binding context path', async () => {
            const annotationPathQualifiers = await getAnnotationPathQualifiers(
                project,
                '',
                '',
                [UIAnnotationTerms.SelectionVariant],
                { type: 'relative' }
            );
            expect(annotationPathQualifiers).toMatchObject({});
        });

        test('getAnnotationPathQualifiers - existing annotations, relative binding context path, filter isCollection', async () => {
            const annotationPathQualifiers = await getAnnotationPathQualifiers(
                project,
                '',
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
            let entityPrompt = getEntityPrompt(context, {
                message: 'entity'
            });
            expect(entityPrompt).toMatchSnapshot();
            expect(entityPrompt.choices).toBeDefined();
            const choices = await (entityPrompt.choices as Choices)();
            expect(choices).toMatchSnapshot();

            entityPrompt = getEntityPrompt({
                ...context,
                project: {} as unknown as Project
            });
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
            let annotationPathPrompt = getAnnotationPathQualifierPrompt(
                context,
                {
                    message: 'testMessage'
                },
                [UIAnnotationTerms.LineItem]
            );
            expect(annotationPathPrompt).toMatchSnapshot();
            const choicesProp = annotationPathPrompt.choices as Choices;
            expect(choicesProp).toBeDefined();
            let choices = await choicesProp({
                buildingBlockData: {
                    metaPath: {
                        entitySet: ENTITY_TYPE
                    }
                }
            });
            expect(choices).toMatchSnapshot();

            // throws error
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

            // no entity set in answers
            choices = await choicesProp({
                buildingBlockData: {
                    metaPath: {}
                }
            });
            expect(choices).toStrictEqual([]);

            // prompt has no properties or annotation terms
            annotationPathPrompt = getAnnotationPathQualifierPrompt(context);
            expect(annotationPathPrompt).toMatchSnapshot();
        });

        test('getAggregationPathPrompt', async () => {
            let aggregationPathPrompt = getAggregationPathPrompt(context, {
                message: 'AggregationPathMessage'
            });
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

            // no properties
            aggregationPathPrompt = getAggregationPathPrompt(context);
            expect(aggregationPathPrompt).toMatchSnapshot();
        });
        test('getViewOrFragmentPathPrompt', async () => {
            let viewOrFragmentPathPrompt = getViewOrFragmentPathPrompt(context, 'validationError', {
                message: 'testMessage',
                dependantPromptNames: ['aggregationPath']
            });
            expect(viewOrFragmentPathPrompt).toMatchSnapshot();
            const choicesProp = viewOrFragmentPathPrompt.choices as Choices;
            expect(choicesProp).toBeDefined();
            const choices = await choicesProp();
            expect(choices.length).toBe(1);

            const validateFn = viewOrFragmentPathPrompt.validate;
            expect(typeof validateFn).toBe('function');
            expect(validateFn?.('')).toBe('validationError');
            expect(validateFn?.('valid')).toBe(true);

            // no properties
            viewOrFragmentPathPrompt = getViewOrFragmentPathPrompt(context, 'validationError');
            expect(viewOrFragmentPathPrompt).toMatchSnapshot();
        });

        test('getBindingContextType', async () => {
            let bindingContextPrompt = getBindingContextTypePrompt({
                message: 'bindingContext',
                dependantPromptNames: ['buildingBlockData.metaPath.qualifier']
            });
            expect(bindingContextPrompt).toMatchSnapshot();

            // no properties
            bindingContextPrompt = getBindingContextTypePrompt();
            expect(bindingContextPrompt).toMatchSnapshot();
        });
        test('getBooleanPrompt', async () => {
            const booleanPrompt = getBooleanPrompt({ name: 'name', message: 'message' });
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
                  "message": "message",
                  "name": "name",
                  "selectType": "static",
                  "type": "list",
                }
            `);
        });
        test('getFilterBarIdPrompt - input type', async () => {
            const prompt = getFilterBarIdPrompt(context, { message: 'message', type: 'input' });
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
            let prompt = getBuildingBlockIdPrompt(context, 'error', {
                message: 'message'
            });
            expect(prompt).toMatchInlineSnapshot(`
                Object {
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

            // no properties
            prompt = getBuildingBlockIdPrompt(context, 'error');
            expect(prompt).toMatchInlineSnapshot(`
                Object {
                  "name": "buildingBlockData.id",
                  "placeholder": "Enter a building block ID",
                  "type": "input",
                  "validate": [Function],
                }
            `);
        });

        test('getFilterBarIdPrompt - list type', async () => {
            const prompt = getFilterBarIdPrompt(context, {
                message: 'message',
                type: 'list',
                placeholder: 'Select or enter a filter bar ID',
                creation: { inputPlaceholder: 'Enter a new filter bar ID' }
            }) as ListPromptQuestion;
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

            const choicesProp = prompt.choices as Choices;
            expect(choicesProp).toBeDefined();
            let choices = await choicesProp({});
            expect(choices).toStrictEqual([]);

            choices = await choicesProp({ viewOrFragmentPath: join('webapp/ext/main/Main.view.xml') });
            expect(choices).toStrictEqual([]);
        });

        test('getCAPServiceChoices', async () => {
            const choices = await getCAPServiceChoices(capProject, capAppFolder);
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
            let prompt = await getCAPServicePrompt(context, {
                message: 'message'
            });
            expect(prompt).toMatchInlineSnapshot(`
                Object {
                  "choices": [Function],
                  "default": "mainService",
                  "message": "message",
                  "name": "service",
                  "placeholder": "Select a service",
                  "selectType": "dynamic",
                  "type": "list",
                }
            `);

            // no properties
            prompt = await getCAPServicePrompt(context);
            expect(prompt).toMatchInlineSnapshot(`
                Object {
                  "choices": [Function],
                  "default": "mainService",
                  "name": "service",
                  "placeholder": "Select a service",
                  "selectType": "dynamic",
                  "type": "list",
                }
            `);
        });
    });
});
