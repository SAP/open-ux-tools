import { createDeferred } from '../../../src/adp/utils';

describe('utils', () => {
    describe('createDeferred', () => {
        it('should create a deferred object', () => {
            const mockResolve = jest.fn();
            const mockReject = jest.fn();

            const mockPromiseConstructor = jest.fn((executor) => {
                executor(mockResolve, mockReject);
            });

            const originalPromise = global.Promise;
            global.Promise = mockPromiseConstructor as unknown as PromiseConstructor;

            const deferred = createDeferred<object>();

            expect(deferred).toHaveProperty('resolve', mockResolve);
            expect(deferred).toHaveProperty('reject', mockReject);

            global.Promise = originalPromise;
        });

        it('should throw error when resolve or reject are null', () => {
            const mockPromiseConstructor = jest.fn((executor) => {
                executor(null, null);
            });

            const originalPromise = global.Promise;
            global.Promise = mockPromiseConstructor as unknown as PromiseConstructor;

            try {
                createDeferred<object>();
            } catch (e) {
                expect(e.message).toBe('Failed to initialize resolve and reject functions.');
            }

            global.Promise = originalPromise;
        });
    });
});
