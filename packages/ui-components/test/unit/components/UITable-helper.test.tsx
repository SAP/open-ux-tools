import { waitFor, sleep } from '../../../src/components/UITable/UITable-helper';

describe('waitFor', () => {
    it('should resolve with the element when it is found', async () => {
        const el = document.createElement('div');
        el.id = 'test-element';
        document.body.appendChild(el);

        const result = await waitFor('#test-element');
        expect(result).toBe(el);
    });

    it('should reject with an error when the element is not found', async () => {
        const result = waitFor('#non-existent-element', 1);
        await expect(result).rejects.toThrowError('Element for selector not found: #non-existent-element');
    });
});

describe('sleep', () => {
    it('should resolve after the specified number of milliseconds', async () => {
        const start = Date.now();
        await sleep(100);
        const end = Date.now();

        expect(end - start).toBeGreaterThanOrEqual(100);
    });
});
