import { waitFor, sleep, _copyAndSort } from '../../../src/components/UITable/UITable-helper';

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
        // server is sometimes so fast, that it calculates the difference in -1ms
        await sleep(110);
        const end = Date.now();

        expect(end - start).toBeGreaterThanOrEqual(100);
    });
});

describe('_copyAndSort', () => {
    const items = [
        {
            title: 'b'
        },
        {
            title: 'w'
        },
        {
            title: 'a'
        },
        {
            title: 'ba'
        }
    ];
    const tests = [
        {
            isSortedDescending: undefined,
            expectedOrder: ['w', 'ba', 'b', 'a']
        },
        {
            isSortedDescending: true,
            expectedOrder: ['a', 'b', 'ba', 'w']
        },
        {
            isSortedDescending: false,
            expectedOrder: ['w', 'ba', 'b', 'a']
        }
    ];
    test.each(tests)('isSortedDescending = $isSortedDescending', ({ isSortedDescending, expectedOrder }) => {
        const result = _copyAndSort(items, 'title', isSortedDescending);
        // Make sure array is copy
        expect(result).not.toEqual(items);
        // Check order
        expect(result.map((item) => item.title)).toEqual(expectedOrder);
    });
});
