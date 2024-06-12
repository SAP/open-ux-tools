import { readFile } from 'fs/promises';
import { join, normalize } from 'path';
import { pathToFileURL } from 'url';

import type { Range, AnnotationFile } from '@sap-ux/odata-annotation-core';
import { VocabularyService } from '@sap-ux/odata-vocabularies';
import { ANNOTATION_GROUP_TYPE, ANNOTATION_TYPE } from '@sap-ux/cds-annotation-parser';

import { createCdsCompilerFacadeForRoot, createMetadataCollector } from '@sap/ux-cds-compiler-facade';
import type { CdsCompilerFacade } from '@sap/ux-cds-compiler-facade';

import type { Target, CdsAnnotationFile } from '@sap-ux/cds-odata-annotation-converter';
import { toAnnotationFile, toTargetMap } from '@sap-ux/cds-odata-annotation-converter';

import type { CompilerToken } from '../../../src/cds/cds-compiler-tokens';
import type { AstNode } from '../../../src/cds/document';
import { getDeletionRangeForNode, getTextEditsForDeletionRanges } from '../../../src/cds/deletion';
import { getAnnotationFromAssignment } from '../../../src/cds/utils';

function getTextForRange(content: string, range: Range): string {
    const lines = content.split('\n');
    if (range.start.line === range.end.line) {
        return lines[range.start.line].substring(range.start.character, range.end.character);
    } else {
        let text = lines[range.start.line].substring(range.start.character);
        for (let line = range.start.line + 1; line < range.end.line; line++) {
            text += '\n' + lines[line];
        }
        text += '\n' + lines[range.end.line].substring(0, range.end.character);
        return text;
    }
}

function getDeletedTextsForQualifierStartString(
    context: TestContext,
    qualifierStartString: string,
    includeTarget = false
): string[] {
    // find first target which has terms matching qualifier
    const targets = [...(context.ast.targetMap || [])].map(([, value]) => value);
    const matches = findNodesByQualifier(targets, qualifierStartString)!;

    const ranges = matches.map(
        ({ index, node, parent, greatGrandParent }) =>
            getDeletionRangeForNode(
                context.vocabularyService,
                context.vocabularyAliases,
                index,
                context.tokens,
                ...getAnnotationFromAssignment(context.facade, node, parent, greatGrandParent)
            )!
    );

    const textEdits = getTextEditsForDeletionRanges(
        ranges,
        context.vocabularyAliases,
        context.tokens,
        context.annotationFile,
        includeTarget
    );

    return textEdits.map((textEdit) => getTextForRange(context.text, textEdit.range));
}

interface Match {
    node: AstNode;
    parent: AstNode;
    index: number;
    greatGrandParent?: AstNode;
}

function findNodesByQualifier(targets: Target[], qualifierStartString: string): Match[] {
    for (const target of targets) {
        const matches = matchTarget(target, qualifierStartString);
        if (matches.length) {
            return matches;
        }
    }
    return [];
}

function matchTarget(target: Target, qualifierStartString: string): Match[] {
    const matches: Match[] = [];
    let i = 0;
    for (const assignment of target.assignments) {
        switch (assignment.type) {
            case ANNOTATION_TYPE: {
                if (assignment.qualifier?.value.startsWith(qualifierStartString)) {
                    matches.push({
                        node: assignment,
                        parent: target,
                        index: i
                    });
                }
                i++;
                break;
            }
            case ANNOTATION_GROUP_TYPE: {
                for (const annotation of assignment.items.items) {
                    if (annotation.qualifier?.value.startsWith(qualifierStartString)) {
                        matches.push({
                            node: annotation,
                            parent: assignment.items,
                            greatGrandParent: target,
                            index: i
                        });
                    }
                    i++;
                }
                break;
            }
            default:
                break;
        }
    }
    return matches;
}
interface TestContext {
    facade: CdsCompilerFacade;
    tokens: CompilerToken[];
    vocabularyAliases: Set<string>;
    text: string;
    ast: CdsAnnotationFile;
    annotationFile: AnnotationFile;
    vocabularyService: VocabularyService;
}

async function prepare(relativeFilePathSegments: string[]): Promise<TestContext> {
    const testDataFolder = join('..', '..', 'data');
    const root = normalize(join(__dirname, testDataFolder, 'cds', 'term-deletion'));
    const filePath = join(root, ...relativeFilePathSegments);

    const fileUri = pathToFileURL(filePath).toString();
    const text = (await readFile(filePath, { encoding: 'utf-8' })).toString();
    const facade = await createCdsCompilerFacadeForRoot(root, [filePath]);
    const metadataElementMap = facade.getMetadata('AdminService');
    const metadataCollector = createMetadataCollector(metadataElementMap, facade);

    const vocabularyService = new VocabularyService(true, false);

    const cdsAnnotationFile = toTargetMap(facade.blitzIndex.forUri(fileUri), fileUri, vocabularyService, facade);
    const annotationFile = toAnnotationFile(fileUri, vocabularyService, cdsAnnotationFile, metadataCollector).file;

    const tokens = facade.getTokensForUri(filePath);

    const vocabularyAliases = new Set<string>();
    for (const [, vocabulary] of vocabularyService.getVocabularies()) {
        vocabularyAliases.add(vocabulary.defaultAlias);
    }

    return {
        vocabularyService,
        ast: cdsAnnotationFile,
        tokens,
        vocabularyAliases,
        facade,
        text,
        annotationFile
    };
}

describe('utils/cds', () => {
    let context: TestContext;
    beforeAll(async () => {
        jest.restoreAllMocks();
        context = await prepare(['app', 'common.cds']);
    });
    // service annotations
    it('delete annotations (Test_BeforeServiceExt*)', () => {
        expect(getDeletedTextsForQualifierStartString(context, 'Test_BeforeServiceExt')).toMatchSnapshot();
    });
    it('delete annotations (Test_AfterServiceNameExt*)', () => {
        expect(getDeletedTextsForQualifierStartString(context, 'Test_AfterServiceNameExt')).toMatchSnapshot();
    });
    // entities/elements
    it('delete annotations (Test_BeforeEntityFirst*)', () => {
        expect(getDeletedTextsForQualifierStartString(context, 'Test_BeforeEntityFirst')).toMatchSnapshot();
    });
    it('delete annotations (Test_BeforeEntityLast*)', () => {
        expect(getDeletedTextsForQualifierStartString(context, 'Test_BeforeEntityLast')).toMatchSnapshot();
    });
    it('delete annotations (Test_BeforeEntityGroupSinglton*)', () => {
        expect(getDeletedTextsForQualifierStartString(context, 'Test_BeforeEntityGroupSinglton')).toMatchSnapshot();
    });
    it('delete annotations (Test_BeforeEntityGroupMiddle1*)', () => {
        expect(getDeletedTextsForQualifierStartString(context, 'Test_BeforeEntityGroupMiddle1')).toMatchSnapshot();
    });
    it('delete annotations (Test_BeforeEntityGroupMiddle*)', () => {
        expect(getDeletedTextsForQualifierStartString(context, 'Test_BeforeEntityGroupMiddle', true)).toMatchSnapshot();
    });
    it('delete annotations (Test_BeforeEntityGroup*)', () => {
        expect(getDeletedTextsForQualifierStartString(context, 'Test_BeforeEntityGroup')).toMatchSnapshot();
    });
    it('delete annotations (Test_SandwichEntity*)', () => {
        expect(getDeletedTextsForQualifierStartString(context, 'Test_SandwichEntity')).toMatchSnapshot();
    });
    it('delete annotations (Test_OnEntityBegin*)', () => {
        expect(getDeletedTextsForQualifierStartString(context, 'Test_OnEntityBegin')).toMatchSnapshot();
    });
    it('delete annotations (Test_InVocGroupBegin*)', () => {
        expect(getDeletedTextsForQualifierStartString(context, 'Test_InVocGroupBegin')).toMatchSnapshot();
    });
    it('delete annotations (Test_InVocGroupMiddle*)', () => {
        expect(getDeletedTextsForQualifierStartString(context, 'Test_InVocGroupMiddle')).toMatchSnapshot();
    });
    it('delete annotations (Test_InVocGroupEnd*)', () => {
        expect(getDeletedTextsForQualifierStartString(context, 'Test_InVocGroupEnd')).toMatchSnapshot();
    });
    it('delete annotations (Test_OnEntityMiddle*)', () => {
        expect(getDeletedTextsForQualifierStartString(context, 'Test_OnEntityMiddle')).toMatchSnapshot();
    });
    it('delete annotations (Test_OnEntityLast*)', () => {
        expect(getDeletedTextsForQualifierStartString(context, 'Test_OnEntityLast')).toMatchSnapshot();
    });
    it('delete annotations (Test_BeforeElement*)', () => {
        expect(getDeletedTextsForQualifierStartString(context, 'Test_BeforeElement')).toMatchSnapshot();
    });
    it('delete annotations (Test_SandwichElement*)', () => {
        expect(getDeletedTextsForQualifierStartString(context, 'Test_SandwichElement')).toMatchSnapshot();
    });
    it('delete annotations (Test_AfterElement*)', () => {
        expect(getDeletedTextsForQualifierStartString(context, 'Test_AfterElement')).toMatchSnapshot();
    });
    it('delete annotations (Test_Element2Lonely*)', () => {
        expect(getDeletedTextsForQualifierStartString(context, 'Test_Element2Lonely')).toMatchSnapshot();
    });
    it('delete annotations (Test_Element3Lonely*)', () => {
        expect(getDeletedTextsForQualifierStartString(context, 'Test_Element3Lonely', true)).toMatchSnapshot();
    });
    it('delete annotations (Test_BeforeElementMultipleLast*)', () => {
        expect(getDeletedTextsForQualifierStartString(context, 'Test_BeforeElementMultipleLast')).toMatchSnapshot();
    });
    it('delete annotations (Test_BeforeElementMultiple*)', () => {
        expect(getDeletedTextsForQualifierStartString(context, 'Test_BeforeElementMultiple')).toMatchSnapshot();
    });
    it('delete annotations (Test_BeforeElementStandaloneMultipleLast*)', () => {
        expect(
            getDeletedTextsForQualifierStartString(context, 'Test_BeforeElementStandaloneMultipleLast')
        ).toMatchSnapshot();
    });
    it('delete annotations (Test_BeforeElementStandaloneMultiple*)', () => {
        expect(
            getDeletedTextsForQualifierStartString(context, 'Test_BeforeElementStandaloneMultiple', true)
        ).toMatchSnapshot();
    });
    it('delete annotations (Test_SandwichElementStandaloneLast*)', () => {
        expect(getDeletedTextsForQualifierStartString(context, 'Test_SandwichElementStandaloneLast')).toMatchSnapshot();
    });
    it('delete annotations (Test_SandwichElementStandalone*)', () => {
        expect(getDeletedTextsForQualifierStartString(context, 'Test_SandwichElementStandalone')).toMatchSnapshot();
    });
    it('delete annotations (Test_Entity_Annotated*)', () => {
        expect(getDeletedTextsForQualifierStartString(context, 'Test_Entity_Annotated', true)).toMatchSnapshot();
    });
    it('delete annotations (Test_Entity2Lonely*)', () => {
        expect(getDeletedTextsForQualifierStartString(context, 'Test_Entity2Lonely', true)).toMatchSnapshot();
    });
    it('delete annotations (Test_Entity3LonelyWithComment*)', () => {
        expect(
            getDeletedTextsForQualifierStartString(context, 'Test_Entity3LonelyWithComment', true)
        ).toMatchSnapshot();
    });
    it('delete annotations (Test_Label*)', () => {
        expect(getDeletedTextsForQualifierStartString(context, 'Test_Label')).toMatchSnapshot();
    });
    it('delete annotations (Test_Employee*)', () => {
        expect(getDeletedTextsForQualifierStartString(context, 'Test_Employee')).toMatchSnapshot();
    });
    it('delete annotations (Test_Label_With_Comments*)', () => {
        expect(getDeletedTextsForQualifierStartString(context, 'Test_Label_With_Comments')).toMatchSnapshot();
    });
    it('delete annotations (Test_Employee_With_Comments*)', () => {
        expect(getDeletedTextsForQualifierStartString(context, 'Test_Employee_With_Comments')).toMatchSnapshot();
    });
    it('delete annotations (Test_BeforeEntityComb7*)', () => {
        expect(getDeletedTextsForQualifierStartString(context, 'Test_BeforeEntityComb7')).toMatchSnapshot();
    });
    it('delete annotations (Test_ElementComb7*)', () => {
        expect(getDeletedTextsForQualifierStartString(context, 'Test_ElementComb7', true)).toMatchSnapshot();
    });
    it('delete annotations (Test_ParamBoundComb7*)', () => {
        expect(getDeletedTextsForQualifierStartString(context, 'Test_ParamBoundComb7', true)).toMatchSnapshot();
    });
    it('delete annotations (Test_comb_without_semicolon*)', () => {
        expect(getDeletedTextsForQualifierStartString(context, 'Test_comb_without_semicolon', true)).toMatchSnapshot();
    });
    it('delete annotations (Test_Element3Native*)', () => {
        expect(getDeletedTextsForQualifierStartString(context, 'Test_Element3Native')).toMatchSnapshot();
    });
    it('delete annotations (Test_Element4Native*)', () => {
        expect(getDeletedTextsForQualifierStartString(context, 'Test_Element4Native', true)).toMatchSnapshot();
    });
    it('delete annotations (Test_Entity2Native*)', () => {
        expect(getDeletedTextsForQualifierStartString(context, 'Test_Entity2Native')).toMatchSnapshot();
    });
    it('delete annotations (Test_Element3Comment*)', () => {
        expect(getDeletedTextsForQualifierStartString(context, 'Test_Element3Comment', true)).toMatchSnapshot();
    });
    it('delete annotations (Test_Element4Comment*)', () => {
        expect(getDeletedTextsForQualifierStartString(context, 'Test_Element4Comment', true)).toMatchSnapshot();
    });
    it('delete annotations (Test_Element5Comment*)', () => {
        expect(getDeletedTextsForQualifierStartString(context, 'Test_Element5Comment', true)).toMatchSnapshot();
    });
    it('delete annotations (Test_Element6Comment*)', () => {
        expect(getDeletedTextsForQualifierStartString(context, 'Test_Element6Comment', true)).toMatchSnapshot();
    });
    it('delete annotations (Test_Element7Comment*)', () => {
        expect(getDeletedTextsForQualifierStartString(context, 'Test_Element7Comment', true)).toMatchSnapshot();
    });
    it('delete annotations (Test_Element8Comment*)', () => {
        expect(getDeletedTextsForQualifierStartString(context, 'Test_Element8Comment', true)).toMatchSnapshot();
    });
    it('delete annotations (Test_Entity2Comment*)', () => {
        expect(getDeletedTextsForQualifierStartString(context, 'Test_Entity2Comment', true)).toMatchSnapshot();
    });
    it('delete annotations (Test_EntityBeforeLonely*)', () => {
        expect(getDeletedTextsForQualifierStartString(context, 'Test_EntityBeforeLonely')).toMatchSnapshot();
    });
    it('delete annotations (Test_Element4WithEntityAnno*)', () => {
        expect(getDeletedTextsForQualifierStartString(context, 'Test_Element4WithEntityAnno', true)).toMatchSnapshot();
    });
    it('delete annotations (Test_PE_ValueList*)', () => {
        expect(getDeletedTextsForQualifierStartString(context, 'Test_PE_ValueList')).toMatchSnapshot();
    });
    // unbound actions/functions
    it('delete annotations (Test_ActionWith1)', () => {
        expect(getDeletedTextsForQualifierStartString(context, 'Test_ActionWith1', true)).toMatchSnapshot();
    });
    it('delete annotations (Test_ActionWith2)', () => {
        expect(getDeletedTextsForQualifierStartString(context, 'Test_ActionWith2', true)).toMatchSnapshot();
    });
    it('delete annotations (Test_ActionWith3)', () => {
        expect(getDeletedTextsForQualifierStartString(context, 'Test_ActionWith3', true)).toMatchSnapshot();
    });
    it('delete annotations (Test_ActionBefore)', () => {
        expect(getDeletedTextsForQualifierStartString(context, 'Test_ActionBefore')).toMatchSnapshot();
    });
    it('delete annotations (Test_ParamAfter1)', () => {
        expect(getDeletedTextsForQualifierStartString(context, 'Test_ParamAfter1', true)).toMatchSnapshot();
    });
    it('delete annotations (Test_ParamBefore1)', () => {
        expect(getDeletedTextsForQualifierStartString(context, 'Test_ParamBefore1', true)).toMatchSnapshot();
    });
    it('delete annotations (Test_ParamBefore2)', () => {
        expect(getDeletedTextsForQualifierStartString(context, 'Test_ParamBefore2', true)).toMatchSnapshot();
    });
    // bound actions/functions
    it('delete annotations (Test_ActionBoundBefore)', () => {
        expect(getDeletedTextsForQualifierStartString(context, 'Test_ActionBoundBefore', true)).toMatchSnapshot();
    });
    it('delete annotations (Test_ActionBoundAfter)', () => {
        expect(getDeletedTextsForQualifierStartString(context, 'Test_ActionBoundAfter', true)).toMatchSnapshot();
    });
    it('delete annotations (Test_ParamBoundBefore)', () => {
        expect(getDeletedTextsForQualifierStartString(context, 'Test_ParamBoundBefore', true)).toMatchSnapshot();
    });
    it('delete annotations (Test_ParamBoundAfter)', () => {
        expect(getDeletedTextsForQualifierStartString(context, 'Test_ParamBoundAfter', true)).toMatchSnapshot();
    });
    it('delete annotations (Test_FunctionBoundBefore)', () => {
        expect(getDeletedTextsForQualifierStartString(context, 'Test_FunctionBoundBefore', true)).toMatchSnapshot();
    });
    it('delete annotations (Test_FunctionBoundAfter)', () => {
        expect(getDeletedTextsForQualifierStartString(context, 'Test_FunctionBoundAfter', true)).toMatchSnapshot();
    });
    // combinations
    it('delete annotations (Test_CombParam1)', () => {
        expect(getDeletedTextsForQualifierStartString(context, 'Test_CombParam1', true)).toMatchSnapshot();
    });
    it('delete annotations (Test_CombParam2)', () => {
        expect(getDeletedTextsForQualifierStartString(context, 'Test_CombParam2', true)).toMatchSnapshot();
    });
    it('delete annotations (Test_CombActionBound1)', () => {
        expect(getDeletedTextsForQualifierStartString(context, 'Test_CombActionBound1', true)).toMatchSnapshot();
    });
    it('delete annotations (Test_CombActionBound2)', () => {
        expect(getDeletedTextsForQualifierStartString(context, 'Test_CombActionBound2', true)).toMatchSnapshot();
    });
    it('delete annotations (Test_CombActionBound3)', () => {
        expect(getDeletedTextsForQualifierStartString(context, 'Test_CombActionBound3', true)).toMatchSnapshot();
    });
    it('delete annotations (Test_CombActionBound4)', () => {
        expect(getDeletedTextsForQualifierStartString(context, 'Test_CombActionBound4')).toMatchSnapshot();
    });
    it('delete annotations (Test_CombActionBound5)', () => {
        expect(getDeletedTextsForQualifierStartString(context, 'Test_CombActionBound5')).toMatchSnapshot();
    });
    it('delete annotations (Test_CombParamBound1)', () => {
        expect(getDeletedTextsForQualifierStartString(context, 'Test_CombParamBound1', true)).toMatchSnapshot();
    });
    it('delete annotations (Test_CombParamBound2)', () => {
        expect(getDeletedTextsForQualifierStartString(context, 'Test_CombParamBound2', true)).toMatchSnapshot();
    });
    it('delete annotations (Test_CombParamBound3)', () => {
        expect(getDeletedTextsForQualifierStartString(context, 'Test_CombParamBound3', true)).toMatchSnapshot();
    });
    it('delete annotations (Test_CombParamBound4)', () => {
        expect(getDeletedTextsForQualifierStartString(context, 'Test_CombParamBound4', true)).toMatchSnapshot();
    });
    it('delete annotations (Test_CombParamBound5)', () => {
        expect(getDeletedTextsForQualifierStartString(context, 'Test_CombParamBound5', true)).toMatchSnapshot();
    });
    it('delete annotations (Test_EntityElementCombinedElem)', () => {
        expect(
            getDeletedTextsForQualifierStartString(context, 'Test_EntityElementCombinedElem', true)
        ).toMatchSnapshot();
    });
});

describe('utils/cds: (embedded)', () => {
    let context: TestContext;
    beforeAll(async () => {
        jest.restoreAllMocks();
        context = await prepare(['srv', 'admin-service.cds']);
    });
    // service annotations
    it('delete annotations (Test_BeforeService*)', () => {
        expect(getDeletedTextsForQualifierStartString(context, 'Test_BeforeService')).toMatchSnapshot();
    });
    it('delete annotations (Test_AfterServiceName*)', () => {
        expect(getDeletedTextsForQualifierStartString(context, 'Test_AfterServiceName')).toMatchSnapshot();
    });
    // entities/elements
    it('delete annotations (Test_BeforeEntityFirst*)', () => {
        expect(getDeletedTextsForQualifierStartString(context, 'Test_BeforeEntityFirst')).toMatchSnapshot();
    });
    it('delete annotations (Test_BeforeEntityLast*)', () => {
        expect(getDeletedTextsForQualifierStartString(context, 'Test_BeforeEntityLast')).toMatchSnapshot();
    });
    it('delete annotations (Test_BeforeEntityGroupSinglton*)', () => {
        expect(getDeletedTextsForQualifierStartString(context, 'Test_BeforeEntityGroupSinglton')).toMatchSnapshot();
    });
    it('delete annotations (Test_BeforeEntityGroupMiddle1*)', () => {
        expect(getDeletedTextsForQualifierStartString(context, 'Test_BeforeEntityGroupMiddle1')).toMatchSnapshot();
    });
    it('delete annotations (Test_BeforeEntityGroupMiddle*)', () => {
        expect(getDeletedTextsForQualifierStartString(context, 'Test_BeforeEntityGroupMiddle')).toMatchSnapshot();
    });
    it('delete annotations (Test_BeforeEntityGroup*)', () => {
        expect(getDeletedTextsForQualifierStartString(context, 'Test_BeforeEntityGroup')).toMatchSnapshot();
    });
    it('delete annotations (Test_SandwichEntity*)', () => {
        expect(getDeletedTextsForQualifierStartString(context, 'Test_SandwichEntity')).toMatchSnapshot();
    });
    it('delete annotations (Test_OnEntityBegin*)', () => {
        expect(getDeletedTextsForQualifierStartString(context, 'Test_OnEntityBegin')).toMatchSnapshot();
    });
    it('delete annotations (Test_InVocGroupBegin*)', () => {
        expect(getDeletedTextsForQualifierStartString(context, 'Test_InVocGroupBegin')).toMatchSnapshot();
    });
    it('delete annotations (Test_InVocGroupMiddle*)', () => {
        expect(getDeletedTextsForQualifierStartString(context, 'Test_InVocGroupMiddle')).toMatchSnapshot();
    });
    it('delete annotations (Test_InVocGroupEnd*)', () => {
        expect(getDeletedTextsForQualifierStartString(context, 'Test_InVocGroupEnd')).toMatchSnapshot();
    });
    it('delete annotations (Test_OnEntityMiddle*)', () => {
        expect(getDeletedTextsForQualifierStartString(context, 'Test_OnEntityMiddle')).toMatchSnapshot();
    });
    it('delete annotations (Test_OnEntityLast*)', () => {
        expect(getDeletedTextsForQualifierStartString(context, 'Test_OnEntityLast')).toMatchSnapshot();
    });
    it('delete annotations (Test_BeforeElement*)', () => {
        expect(getDeletedTextsForQualifierStartString(context, 'Test_BeforeElement')).toMatchSnapshot();
    });
    it('delete annotations (Test_SandwichElement*)', () => {
        expect(getDeletedTextsForQualifierStartString(context, 'Test_SandwichElement')).toMatchSnapshot();
    });
    it('delete annotations (Test_AfterElement*)', () => {
        expect(getDeletedTextsForQualifierStartString(context, 'Test_AfterElement')).toMatchSnapshot();
    });
    it('delete annotations (Test_Element2Lonely*)', () => {
        expect(getDeletedTextsForQualifierStartString(context, 'Test_Element2Lonely')).toMatchSnapshot();
    });
    it('delete annotations (Test_Entity2Lonely*)', () => {
        expect(getDeletedTextsForQualifierStartString(context, 'Test_Entity2Lonely', true)).toMatchSnapshot();
    });
    it('delete annotations (Test_Entity2Native*)', () => {
        expect(getDeletedTextsForQualifierStartString(context, 'Test_Entity2Native')).toMatchSnapshot();
    });
    // bound actions/functions
    it('delete annotations (Test_OnActionBoundEmbBefore)', () => {
        expect(getDeletedTextsForQualifierStartString(context, 'Test_OnActionBoundEmbBefore')).toMatchSnapshot();
    });
    it('delete annotations (Test_OnActionBoundEmbInner)', () => {
        expect(getDeletedTextsForQualifierStartString(context, 'Test_OnActionBoundEmbInner')).toMatchSnapshot();
    });
    it('delete annotations (Test_OnParamEmbAfter)', () => {
        expect(getDeletedTextsForQualifierStartString(context, 'Test_OnParamEmbAfter')).toMatchSnapshot();
    });
    it('delete annotations (Test_OnFunctionBoundEmbBefore)', () => {
        expect(getDeletedTextsForQualifierStartString(context, 'Test_OnFunctionBoundEmbBefore')).toMatchSnapshot();
    });
    it('delete annotations (Test_OnFunctionBoundEmbInner)', () => {
        expect(getDeletedTextsForQualifierStartString(context, 'Test_OnFunctionBoundEmbInner')).toMatchSnapshot();
    });
    // unbound actions/functions
    it('delete annotations (Test_OnActionEmbBefore)', () => {
        expect(getDeletedTextsForQualifierStartString(context, 'Test_OnActionEmbBefore')).toMatchSnapshot();
    });
    it('delete annotations (Test_OnActionEmbInner)', () => {
        expect(getDeletedTextsForQualifierStartString(context, 'Test_OnActionEmbInner')).toMatchSnapshot();
    });
    it('delete annotations (Test_OnParamEmbBefore)', () => {
        expect(getDeletedTextsForQualifierStartString(context, 'Test_OnParamEmbBefore')).toMatchSnapshot();
    });
    it('delete annotations (Test_OnParamEmbAfter)', () => {
        expect(getDeletedTextsForQualifierStartString(context, 'Test_OnParamEmbAfter')).toMatchSnapshot();
    });
    it('delete annotations (Test_OnFunctionEmbBefore)', () => {
        expect(getDeletedTextsForQualifierStartString(context, 'Test_OnFunctionEmbBefore')).toMatchSnapshot();
    });
    it('delete annotations (Test_OnFunctionEmbInner)', () => {
        expect(getDeletedTextsForQualifierStartString(context, 'Test_OnFunctionEmbInner')).toMatchSnapshot();
    });
    it('delete annotations (Test_OnParamEmbInner)', () => {
        expect(getDeletedTextsForQualifierStartString(context, 'Test_OnParamEmbInner')).toMatchSnapshot();
    });
});
