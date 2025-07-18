import { Range } from '@sap-ux/odata-annotation-core-types';
import type { Comment } from '../../../src/cds/comments';

import { PROJECTS } from '../projects';
import { getCDSDocument } from './utils';

async function getComments(text: string): Promise<Comment[]> {
    const [, document] = await getCDSDocument(PROJECTS.V4_CDS_START.root, text);
    return document.comments;
}

describe('getComments', () => {
    test('single line comment', async () => {
        const comments = await getComments(`// test comment`);
        expect(comments).toStrictEqual([
            {
                range: Range.create(0, 0, 0, 15),
                type: 'comment',
                value: '// test comment'
            }
        ]);
    });
    test('single line comment after code', async () => {
        const comments = await getComments(`Service S { entity E {}; };
            annotate S.E with @(
                UI.LineItem: [
                    {
                        // comment inside
                        Value: value2,
                    }, // after
                ]
            )`);
        expect(comments).toStrictEqual([
            {
                range: Range.create(4, 24, 4, 41),
                type: 'comment',
                value: '// comment inside'
            },
            {
                range: Range.create(6, 23, 6, 31),
                type: 'comment',
                value: '// after'
            }
        ]);
    });
    test('block comment', async () => {
        const comments = await getComments(`/* block comment */`);
        expect(comments).toStrictEqual([
            {
                range: Range.create(0, 0, 0, 19),
                type: 'comment',
                value: '/* block comment */'
            }
        ]);
    });
    test('doc comment', async () => {
        const comments = await getComments(`/** doc comment */`);
        expect(comments).toStrictEqual([
            {
                range: Range.create(0, 0, 0, 18),
                type: 'comment',
                value: '/** doc comment */'
            }
        ]);
    });
});
