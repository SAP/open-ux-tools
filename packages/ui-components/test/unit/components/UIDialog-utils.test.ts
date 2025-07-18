import { addScaleToTransform } from '../../../src/components/UIDialog/UIDialog-helper';

describe('addScaleToTransform', () => {
    it('adds scale to empty transform', () => {
        expect(addScaleToTransform('', 1.5)).toBe('scale(1.5)');
    });

    it('adds scale to transform with translate', () => {
        expect(addScaleToTransform('translate(10px, 20px)', 2)).toBe('translate(10px, 20px) scale(2)');
    });

    it('replaces existing scale with new value', () => {
        expect(addScaleToTransform('scale(0.5)', 1.2)).toBe('scale(1.2)');
    });

    it('replaces existing scale and keeps translate', () => {
        expect(addScaleToTransform('translate(0, 0) scale(1)', 0.8)).toBe('translate(0, 0) scale(0.8)');
    });

    it('handles extra whitespace and replaces scale', () => {
        expect(addScaleToTransform('  translate(5px, 5px)   scale(0.9)  ', 1)).toBe('translate(5px, 5px) scale(1)');
    });

    it('handles no transform (only whitespace)', () => {
        expect(addScaleToTransform('   ', 0.75)).toBe('scale(0.75)');
    });
});
