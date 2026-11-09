import { formatXml } from '../../../src/utils/format-xml';

describe('formatXml', () => {
    it('indents well-formed XML with 4 spaces', () => {
        expect(formatXml('<a><b>1</b></a>')).toContain('    <b>1</b>');
    });

    it('returns a string and never throws on input it cannot pretty-print', () => {
        const bad = '<<<not xml';
        expect(formatXml(bad)).toBe(bad);
    });
});
