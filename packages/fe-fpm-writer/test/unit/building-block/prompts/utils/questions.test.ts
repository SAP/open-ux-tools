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
    getViewOrFragmentPathPrompt
} from '../../../../../src/building-block/prompts/utils/questions';
import type { ListPromptQuestion, PromptContext } from '../../../../../src/prompts/types';

const projectFolder = join(__dirname, '../../../sample/building-block/webapp-prompts');
const capProjectFolder = join(__dirname, '../../../sample/building-block/webapp-prompts-cap');
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

describe('utils - questions', () => {
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
            guiOptions: {
                dependantPromptNames: ['aggregationPath']
            }
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
            guiOptions: {
                dependantPromptNames: ['buildingBlockData.metaPath.qualifier']
            }
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
              "guiOptions": Object {
                "selectType": "static",
              },
              "message": "message",
              "name": "name",
              "type": "list",
            }
        `);
    });
    test('getFilterBarIdPrompt - input type', async () => {
        const prompt = getFilterBarIdPrompt(context, { message: 'message', type: 'input' });
        expect(prompt).toMatchInlineSnapshot(`
            Object {
              "guiOptions": Object {
                "placeholder": "Enter a new filter bar ID",
              },
              "message": "message",
              "name": "buildingBlockData.filterBar",
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
              "guiOptions": Object {
                "placeholder": "Enter a building block ID",
              },
              "message": "message",
              "name": "buildingBlockData.id",
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
              "guiOptions": Object {
                "placeholder": "Enter a building block ID",
              },
              "name": "buildingBlockData.id",
              "type": "input",
              "validate": [Function],
            }
        `);
    });

    test('getFilterBarIdPrompt - list type', async () => {
        const prompt = getFilterBarIdPrompt(context, {
            message: 'message',
            type: 'list',
            guiOptions: {
                placeholder: 'Select or enter a filter bar ID',
                creation: { placeholder: 'Enter a new filter bar ID' }
            }
        }) as ListPromptQuestion;
        expect(prompt).toMatchInlineSnapshot(`
            Object {
              "choices": [Function],
              "guiOptions": Object {
                "creation": Object {
                  "placeholder": "Enter a new filter bar ID",
                },
                "placeholder": "Select or enter a filter bar ID",
                "selectType": "dynamic",
              },
              "message": "message",
              "name": "buildingBlockData.filterBar",
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
              "guiOptions": Object {
                "placeholder": "Select a service",
                "selectType": "dynamic",
              },
              "message": "message",
              "name": "service",
              "type": "list",
            }
        `);

        // no properties
        prompt = await getCAPServicePrompt(context);
        expect(prompt).toMatchInlineSnapshot(`
            Object {
              "choices": [Function],
              "default": "mainService",
              "guiOptions": Object {
                "placeholder": "Select a service",
                "selectType": "dynamic",
              },
              "name": "service",
              "type": "list",
            }
        `);
    });
});
