import { getIndentLevelFromPointer } from '../../../src/cds/indent';

import { PROJECTS } from '../projects';
import { getCDSDocument } from './utils';

describe('getIndentLevelFromNode', () => {
    test('target', async () => {
        const fixture = `Service S { entity E {}; };
annotate S.E with @(
    UI.LineItem : []
);`;
        const [, document] = await getCDSDocument(PROJECTS.V4_CDS_START.root, fixture);
        const indent = getIndentLevelFromPointer(document.ast, document.tokens, '/targets/0');
        expect(indent).toStrictEqual(0);
    });
    test('target element', async () => {
        const fixture = `Service S { entity E { name: String; }; };
annotate S.E with {
    name @title: 'test';
}`;
        const [, document] = await getCDSDocument(PROJECTS.V4_CDS_START.root, fixture);
        const indent = getIndentLevelFromPointer(document.ast, document.tokens, '/targets/0');
        expect(indent).toStrictEqual(1);
    });
    test('indented target', async () => {
        const fixture = `Service S { entity E {}; };
        annotate S.E with @(
            UI.LineItem : []
        );
`;
        const [, document] = await getCDSDocument(PROJECTS.V4_CDS_START.root, fixture);
        const indent = getIndentLevelFromPointer(document.ast, document.tokens, '/targets/0');
        expect(indent).toStrictEqual(2);
    });
    test('multiple targets', async () => {
        const fixture = `Service S { entity E {}; };
    annotate S.E with @UI.LineItem #a : [];
        annotate S.E with @UI.LineItem #b : [];
            annotate S.E with @UI.LineItem #c: [];
`;
        const [, document] = await getCDSDocument(PROJECTS.V4_CDS_START.root, fixture);
        expect(getIndentLevelFromPointer(document.ast, document.tokens, '/targets/0')).toStrictEqual(1);
        expect(getIndentLevelFromPointer(document.ast, document.tokens, '/targets/1')).toStrictEqual(2);
        expect(getIndentLevelFromPointer(document.ast, document.tokens, '/targets/2')).toStrictEqual(3);
    });
    test('single line annotation', async () => {
        const fixture = `Service S { entity E {}; };
annotate S.E with @UI.LineItem : [];`;
        const [, document] = await getCDSDocument(PROJECTS.V4_CDS_START.root, fixture);
        const indent = getIndentLevelFromPointer(document.ast, document.tokens, '/targets/0/assignments/0/value');
        expect(indent).toStrictEqual(0);
    });
    test('two line annotation', async () => {
        const fixture = `Service S { entity E {}; };
annotate S.E with @(
    UI.LineItem : [];
)`;
        const [, document] = await getCDSDocument(PROJECTS.V4_CDS_START.root, fixture);
        const indent = getIndentLevelFromPointer(document.ast, document.tokens, '/targets/0/assignments/0/value');
        expect(indent).toStrictEqual(1);
    });
    test('record in collection (same line)', async () => {
        const fixture = `Service S { entity E {}; };
annotate S.E with @(
    UI.LineItem : [{ 
        $Type: 'UI.DataField'
    }];
)`;
        const [, document] = await getCDSDocument(PROJECTS.V4_CDS_START.root, fixture);
        const indent = getIndentLevelFromPointer(
            document.ast,
            document.tokens,
            '/targets/0/assignments/0/value/items/0'
        );
        expect(indent).toStrictEqual(1);
    });
    test('record in collection (new line)', async () => {
        const fixture = `Service S { entity E {}; };
annotate S.E with @(
    UI.LineItem : [
        { 
            $Type: 'UI.DataField'
        }
    ];
)`;
        const [, document] = await getCDSDocument(PROJECTS.V4_CDS_START.root, fixture);
        const indent = getIndentLevelFromPointer(
            document.ast,
            document.tokens,
            '/targets/0/assignments/0/value/items/0'
        );
        expect(indent).toStrictEqual(2);
    });
});
