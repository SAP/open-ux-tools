import { getLineOffsets } from '../src/line-offsets';

describe('getLineOffsets', () => {
    test('should return [0] for an empty string', () => {
        const result = getLineOffsets('');
        expect(result).toEqual([0]);
    });

    test('should handle text without line breaks', () => {
        const result = getLineOffsets('Hello world');
        expect(result).toEqual([0]);
    });

    test('should handle text with \\n line breaks', () => {
        const result = getLineOffsets('Hello\nworld\n');
        expect(result).toEqual([0, 6, 12]);
    });

    test('should handle text with \\r\\n line breaks', () => {
        const result = getLineOffsets('Hello\r\nworld\r\n');
        expect(result).toEqual([0, 7, 14]);
    });

    test('should handle mixed line breaks', () => {
        const result = getLineOffsets('Hello\nworld\r\n!');
        expect(result).toEqual([0, 6, 13]);
    });

    test('should handle text ending with \\r', () => {
        const result = getLineOffsets('Hello\r');
        expect(result).toEqual([0, 6]);
    });

    test('should handle text ending with \\n', () => {
        const result = getLineOffsets('Hello\n');
        expect(result).toEqual([0, 6]);
    });

    test('should handle text with \\r followed by non-\\n character', () => {
        const result = getLineOffsets('Hello\rworld');
        expect(result).toEqual([0, 6]);
    });
});
