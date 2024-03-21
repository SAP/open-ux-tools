import type FlexCommand from 'sap/ui/rta/command/FlexCommand';

import MessageToast from 'mock/sap/m/MessageToast';

import { createDeferred, matchesFragmentName, notifyUser } from '../../../src/adp/utils';

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

    describe('matchesFragmentName', () => {
        const createMockCommand = (fragmentPath: string | undefined) => ({
            getPreparedChange: () => ({
                getDefinition: () => ({
                    content: {
                        fragmentPath
                    }
                })
            })
        });

        it('returns true when the fragment path matches the specified fragment name', () => {
            const fragmentName = 'testFragment';
            const command = createMockCommand(`${fragmentName}.fragment.xml`) as unknown as FlexCommand;

            expect(matchesFragmentName(command, fragmentName)).toBe(true);
        });

        it('returns false when the fragment path does not match the specified fragment name', () => {
            const fragmentName = 'Share';
            const command = createMockCommand('Delete.fragment.xml') as unknown as FlexCommand;

            expect(matchesFragmentName(command, fragmentName)).toBe(false);
        });

        it('returns false when the fragment path is undefined', () => {
            const fragmentName = 'Share';
            const command = createMockCommand(undefined) as unknown as FlexCommand;

            expect(matchesFragmentName(command, fragmentName)).toBe(false);
        });

        it('returns false when the fragment path is empty', () => {
            const fragmentName = 'Share';
            const command = createMockCommand('') as unknown as FlexCommand;

            expect(matchesFragmentName(command, fragmentName)).toBe(false);
        });
    });

    describe('notifyUser', () => {
        beforeEach(() => {
            MessageToast.show.mockClear();
        });

        it('displays the message with default duration if no duration is provided', () => {
            const message = 'Hello, world!';
            notifyUser(message);

            expect(MessageToast.show).toHaveBeenCalledWith(message, {
                duration: 5000
            });
        });

        it('displays the message with specified duration', () => {
            const message = 'Goodbye, world!';
            const duration = 3000;
            notifyUser(message, duration);

            expect(MessageToast.show).toHaveBeenCalledWith(message, {
                duration
            });
        });
    });
});
