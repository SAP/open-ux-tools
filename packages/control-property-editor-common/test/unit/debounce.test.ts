import { debounce } from '../../src/debounce';

describe('debounce', () => {
    beforeAll(() => {
        jest.useFakeTimers();
    });
    test('call twice', () => {
        const callback = jest.fn();
        const fn = debounce(callback, 1000);
        fn();
        fn();
        jest.advanceTimersByTime(1200);
        expect(callback).toHaveBeenCalledTimes(1);
    });

    test('call twice with params', () => {
        const callback = jest.fn();
        const fn = debounce(callback, 1000) as any;
        fn('test' as any);
        fn('test1' as any);
        jest.advanceTimersByTime(1200);
        expect(callback).toHaveBeenCalledTimes(1);
        expect(callback).toHaveBeenCalledWith('test1');
    });
});
