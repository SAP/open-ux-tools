import { BuildingBlockType } from '@sap-ux/fe-fpm-writer';
import {
    questionsToShape,
    buildMemberFromQuestions
} from '../../../../../src/tools/functionalities/building-block/prompt-derived-schema.js';

describe('questionsToShape', () => {
    test('skips routing questions and buildingBlockData.id', () => {
        const shape = questionsToShape([
            { name: 'viewOrFragmentPath', type: 'list' },
            { name: 'aggregationPath', type: 'list' },
            { name: 'service', type: 'list' },
            { name: 'buildingBlockData.id', type: 'input' }
        ]);
        expect(Object.keys(shape)).toEqual([]);
    });

    test('collapses nested metaPath.* questions into a single flat metaPath string', () => {
        const shape = questionsToShape([
            { name: 'buildingBlockData.metaPath.entitySet', type: 'list', guiOptions: { mandatory: true } },
            { name: 'buildingBlockData.metaPath.qualifier', type: 'list', guiOptions: { mandatory: true } },
            { name: 'buildingBlockData.metaPath.bindingContextType', type: 'list' }
        ]);
        expect(Object.keys(shape)).toEqual(['metaPath']);
        // Flat metaPath is optional regardless of the nested mandatory flags.
        expect(shape['metaPath'].safeParse(undefined).success).toBe(true);
        expect(shape['metaPath'].safeParse('/Booking/@UI.LineItem#q').success).toBe(true);
        expect(shape['metaPath'].safeParse(42).success).toBe(false);
    });

    test('maps list with static string choices to an enum', () => {
        const shape = questionsToShape([
            {
                name: 'buildingBlockData.type',
                type: 'list',
                choices: [
                    { name: 'Responsive Table', value: 'ResponsiveTable' },
                    { name: 'Grid Table', value: 'GridTable' }
                ]
            }
        ]);
        expect(shape['type'].safeParse('ResponsiveTable').success).toBe(true);
        expect(shape['type'].safeParse('GridTable').success).toBe(true);
        expect(shape['type'].safeParse('NopeTable').success).toBe(false);
    });

    test('maps list with boolean choices to a boolean', () => {
        const shape = questionsToShape([
            {
                name: 'buildingBlockData.readOnly',
                type: 'list',
                default: false,
                choices: [
                    { name: 'False', value: false },
                    { name: 'True', value: true }
                ]
            }
        ]);
        expect(shape['readOnly'].safeParse(true).success).toBe(true);
        expect(shape['readOnly'].safeParse('true').success).toBe(false);
    });

    test('maps checkbox with static choices to an array of enum', () => {
        const shape = questionsToShape([
            {
                name: 'buildingBlockData.personalization',
                type: 'checkbox',
                choices: [
                    { name: 'Type', value: 'Type' },
                    { name: 'Item', value: 'Item' },
                    { name: 'Sort', value: 'Sort' }
                ]
            }
        ]);
        expect(shape['personalization'].safeParse(['Type', 'Sort']).success).toBe(true);
        expect(shape['personalization'].safeParse(['Nope']).success).toBe(false);
    });

    test('falls back to string for list/input questions with dynamic (non-array) choices', () => {
        const shape = questionsToShape([
            { name: 'buildingBlockData.targetProperty', type: 'list', choices: () => ['x'] },
            { name: 'buildingBlockData.filterBar', type: 'input' }
        ]);
        expect(shape['targetProperty'].safeParse('description').success).toBe(true);
        expect(shape['filterBar'].safeParse('myFilterBar').success).toBe(true);
    });

    test('required iff mandatory and no default (default implies the writer supplies a value)', () => {
        const shape = questionsToShape([
            { name: 'buildingBlockData.title', type: 'input', guiOptions: { mandatory: true } },
            {
                name: 'buildingBlockData.templateType',
                type: 'list',
                default: 'basic',
                guiOptions: { mandatory: true },
                choices: [
                    { name: 'Basic', value: 'basic' },
                    { name: 'Full', value: 'full' }
                ]
            }
        ]);
        expect(shape['title'].safeParse(undefined).success).toBe(false); // required
        expect(shape['templateType'].safeParse(undefined).success).toBe(true); // optional (has default)
    });
});

describe('buildMemberFromQuestions', () => {
    test('produces a looseObject member: enum enforced, extras pass through, no contextPath required', () => {
        const member = buildMemberFromQuestions(BuildingBlockType.Table, [
            {
                name: 'buildingBlockData.type',
                type: 'list',
                choices: [
                    { name: 'Responsive Table', value: 'ResponsiveTable' },
                    { name: 'Grid Table', value: 'GridTable' }
                ]
            },
            { name: 'buildingBlockData.metaPath.entitySet', type: 'list', guiOptions: { mandatory: true } }
        ]);
        const ok = member.safeParse({
            buildingBlockType: 'table',
            type: 'GridTable',
            metaPath: '/Booking/@UI.LineItem',
            // extra bb_macro_api.md attribute not declared — must pass through
            filterBar: 'bar1'
        });
        expect(ok.success).toBe(true);
        expect((ok as any).data.filterBar).toBe('bar1');
        expect(member.safeParse({ buildingBlockType: 'table', type: 'WrongTable' }).success).toBe(false);
    });

    test('Page member derived from prompts (no metaPath questions) exposes no metaPath/contextPath', () => {
        const member = buildMemberFromQuestions(BuildingBlockType.Page, [
            { name: 'buildingBlockData.title', type: 'input', guiOptions: { mandatory: true } },
            { name: 'buildingBlockData.description', type: 'input' }
        ]);
        expect(member.safeParse({ buildingBlockType: 'page', title: 'My Page' }).success).toBe(true);
        // title is required
        expect(member.safeParse({ buildingBlockType: 'page' }).success).toBe(false);
    });
});
