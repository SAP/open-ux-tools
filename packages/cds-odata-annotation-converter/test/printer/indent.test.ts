import { indent } from '../../src/printer/indent';

describe('indent', () => {
    test('object in array', () => {
        const result = indent('[\n{\n}\n]');
        expect(result).toMatchInlineSnapshot(`
            "[
                {
                }
            ]"
        `);
    });
    test('object with properties', () => {
        const result = indent('{\na:1,\nb:"xyz",\nc:d\n}');
        expect(result).toMatchInlineSnapshot(`
            "{
                a:1,
                b:\\"xyz\\",
                c:d
            }"
        `);
    });
    test('opening and closing in the same line', () => {
        const result = indent('[{a:1}]');
        expect(result).toMatchInlineSnapshot(`"[{a:1}]"`);
    });
});
