import { removeEscapeSequences } from '../../src/parser/escaping';

describe('removeEscapeSequences', () => {
    it('', () => {
        const result = removeEscapeSequences('--->&apos;&gt;&lt;&amp;&quot;<---');
        expect(result).toMatchInlineSnapshot(`"--->'><&\\"<---"`);
    });
});

