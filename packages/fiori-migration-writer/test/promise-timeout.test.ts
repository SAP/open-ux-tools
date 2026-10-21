import { withTimeoutAndFallback } from '../src/utils/promise-timeout';

describe('promise-timeout utility', () => {
    describe('withTimeoutAndFallback', () => {
        it('should return the promise result when it resolves before timeout', async () => {
            const promiseFactory = () => Promise.resolve('success');
            const result = await withTimeoutAndFallback(promiseFactory, 1000, 'fallback');

            expect(result).toBe('success');
        });

        it('should return fallback value when promise times out', async () => {
            const promiseFactory = () =>
                new Promise((resolve) => {
                    setTimeout(() => resolve('too-late'), 5000);
                });

            const startTime = Date.now();
            const result = await withTimeoutAndFallback(promiseFactory, 500, 'fallback');
            const duration = Date.now() - startTime;

            expect(result).toBe('fallback');
            expect(duration).toBeGreaterThan(400);
            expect(duration).toBeLessThan(700);
        });

        it('should return fallback value when promise rejects', async () => {
            const promiseFactory = () => Promise.reject(new Error('Network error'));
            const result = await withTimeoutAndFallback(promiseFactory, 1000, 'fallback');

            expect(result).toBe('fallback');
        });

        it('should clear timeout on successful completion', async () => {
            const promiseFactory = () => Promise.resolve('quick');
            const result = await withTimeoutAndFallback(promiseFactory, 1000, 'fallback');

            expect(result).toBe('quick');
            // Wait to ensure no timeout fires after cleanup
            await new Promise((resolve) => setTimeout(resolve, 100));
        });

        it('should clear timeout on error', async () => {
            const promiseFactory = () => Promise.reject(new Error('fail'));
            const result = await withTimeoutAndFallback(promiseFactory, 1000, 'fallback');

            expect(result).toBe('fallback');
            // Wait to ensure no timeout fires after cleanup
            await new Promise((resolve) => setTimeout(resolve, 100));
        });

        it('should handle complex fallback values', async () => {
            const fallback = { version: '1.0.0', status: 'fallback' };
            const promiseFactory = () => Promise.reject(new Error('error'));

            const result = await withTimeoutAndFallback(promiseFactory, 1000, fallback);

            expect(result).toEqual(fallback);
        });

        it('should handle zero timeout', async () => {
            const promiseFactory = () =>
                new Promise((resolve) => {
                    setTimeout(() => resolve('delayed'), 100);
                });

            const result = await withTimeoutAndFallback(promiseFactory, 0, 'fallback');
            expect(result).toBe('fallback');
        });

        it('should execute promiseFactory immediately', async () => {
            let executed = false;
            const promiseFactory = () => {
                executed = true;
                return Promise.resolve('result');
            };

            await withTimeoutAndFallback(promiseFactory, 1000, 'fallback');
            expect(executed).toBe(true);
        });

        it('should not call promiseFactory multiple times', async () => {
            let callCount = 0;
            const promiseFactory = () => {
                callCount++;
                return Promise.resolve('result');
            };

            await withTimeoutAndFallback(promiseFactory, 1000, 'fallback');
            expect(callCount).toBe(1);
        });

        it('should handle promise that resolves at boundary of timeout', async () => {
            const promiseFactory = () =>
                new Promise((resolve) => {
                    setTimeout(() => resolve('boundary'), 450);
                });

            const result = await withTimeoutAndFallback(promiseFactory, 500, 'fallback');
            // Should succeed since it's just before timeout
            expect(result).toBe('boundary');
        }, 1000);

        it('should return fallback for very long timeout value', async () => {
            const promiseFactory = () => Promise.reject(new Error('immediate fail'));
            const result = await withTimeoutAndFallback(promiseFactory, 999999, 'fallback');

            expect(result).toBe('fallback');
        });

        it('should handle undefined fallback value', async () => {
            const promiseFactory = () => Promise.reject(new Error('fail'));
            const result = await withTimeoutAndFallback(promiseFactory, 1000, undefined);

            expect(result).toBeUndefined();
        });
    });
});
