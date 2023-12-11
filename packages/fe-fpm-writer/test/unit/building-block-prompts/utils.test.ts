import { UIAnnotationTerms } from '@sap-ux/vocabularies-types/vocabularies/UI';
import type { Answers, DistinctChoice, ListChoiceMap } from 'inquirer';
import { join } from 'path';
import ProjectProvider from '../../../src/building-block/utils/project';
import {
    getEntityPrompt,
    getAggregationPathPrompt,
    getAnnotationPathQualifierPrompt,
    getViewOrFragmentFilePrompt,
    getBooleanPrompt,
    getChoices
} from '../../../src/building-block/utils/prompts';
import {
    getAnnotationPathQualifiers,
    getAnnotationTermAlias,
    getEntityTypes
} from '../../../src/building-block/utils/service';
import type { Editor } from 'mem-fs-editor';
import { create } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';

const projectFolder = join(__dirname, '../sample/building-block/webapp-prompts');

jest.mock('@sap-ux/project-access', () => ({
    __esModule: true,
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    ...(jest.requireActual('@sap-ux/project-access') as object),
    getFileByExtension: jest.fn().mockResolvedValue([join(projectFolder, 'webapp/ext', 'Main.view.xml')])
}));

const ENTITY_TYPE = 'C_CUSTOMER_OP_SRV.C_CustomerOPType';
type Choices = (answers?: Answers) => Promise<readonly DistinctChoice<Answers, ListChoiceMap<Answers>>[]>;

describe('utils - ', () => {
    let projectProvider: ProjectProvider;
    let fs: Editor;

    beforeAll(async () => {
        projectProvider = await ProjectProvider.createProject(projectFolder);
        fs = create(createStorage());
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
            const entityPrompt = getEntityPrompt('entity', projectProvider);
            expect(entityPrompt).toMatchSnapshot();

            expect(entityPrompt.choices).toBeDefined();

            const choices = await (entityPrompt.choices as Choices)();

            expect(choices).toMatchSnapshot();
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
            const aggregationPathPrompt = getAnnotationPathQualifierPrompt(
                'testAnnotationPath',
                'testMessage',
                projectProvider,
                [UIAnnotationTerms.LineItem]
            );
            expect(aggregationPathPrompt).toMatchSnapshot();
            const choicesProp = aggregationPathPrompt.choices as Choices;
            expect(choicesProp).toBeDefined();
            const choices = await choicesProp({
                entity: ENTITY_TYPE
            });
            expect(choices).toMatchSnapshot();
        });

        test('getAggregationPathPrompt', async () => {
            const aggregationPathPrompt = getAggregationPathPrompt('AggregationPathMessage', fs);
            expect(aggregationPathPrompt).toMatchSnapshot();
            const choicesProp = aggregationPathPrompt.choices as Choices;
            expect(choicesProp).toBeDefined();
            const choices = await choicesProp({
                viewOrFragmentFile: join(projectFolder, 'ext/main/Main.view.xml')
            });
            expect(choices).toMatchSnapshot();
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
                  "message": "message",
                  "name": "name",
                  "type": "list",
                }
            `);
        });
    });
});
