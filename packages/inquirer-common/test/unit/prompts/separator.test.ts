import { Separator } from '../../../src/prompts/separator';

describe('Separator test', () => {
    test('Separator', () => {
        const separator = new Separator('Some group header');
        expect(separator.line).toBe('[2mSome group header[22m');
        expect(separator.type).toBe('separator');
        expect(separator.toString()).toBe('[2mSome group header[22m');
        expect(Separator.exclude(separator)).toBe(false);
    });
});
