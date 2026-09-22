import { createSmolLm2Tokenizer } from '../../src/model/smollm-tokenizer.js';

describe('SmolLM2 tokenizer', () => {
    test('preserves added ChatML tokens and byte-level BPE text', () => {
        const tokenizer = createSmolLm2Tokenizer({
            model: {
                type: 'BPE',
                vocab: { A: 0, c: 1, m: 2, e: 3, '<|im_start|>': 4 },
                merges: []
            },
            added_tokens: [{ id: 4, content: '<|im_start|>', special: true }]
        });

        const ids = tokenizer.encode('<|im_start|>Acme');

        expect(ids).toEqual([4, 0, 1, 2, 3]);
        expect(tokenizer.decode(ids)).toBe('<|im_start|>Acme');
        expect(tokenizer.specialTokenIds).toEqual([4]);
        expect(tokenizer.specialTokenId('<|im_start|>')).toBe(4);
    });

    test('rejects incompatible tokenizer JSON', () => {
        expect(() => createSmolLm2Tokenizer({ model: { type: 'WordPiece' } })).toThrow(/BPE/);
    });
});
