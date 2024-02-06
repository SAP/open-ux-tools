// FileWatcher.test.ts

import { FileWatcher } from '../../../src/base/watcher';
import * as watchman from 'fb-watchman';
import { sep } from 'path';

jest.mock('fb-watchman', () => ({
    Client: jest.fn().mockReturnValue({
        command: jest.fn(),
        emit: jest.fn(),
        end: jest.fn()
    })
}));

const onChangeMock = jest.fn();

describe('FileWatcher', () => {
    it('should handle file changes', () => {
        // Arrange
        const clientMock = new (watchman.Client as jest.MockedClass<typeof watchman.Client>)();
        clientMock.command = jest.fn().mockImplementation((commands, callback) => {
            // Mock the response from the watch-project command
            const resp = { watch: 'test-watch', relative_path: 'test-path' };
            callback(null, resp);
        });

        clientMock.on = jest.fn().mockImplementation((event, callback) => {
            // Mock the response from the subscription event
            const fileChangeResp = {
                is_fresh_instance: false,
                root: '/path/to/project',
                files: [{ name: 'example.change' }]
            };
            callback(fileChangeResp);
        });

        // Act
        // eslint-disable-next-line no-new
        new FileWatcher('/path/to/project', onChangeMock);

        // Assert
        const expectedPath = '/path/to/project/example.change'.split('/').join(sep);
        expect(onChangeMock).toHaveBeenCalledWith([expectedPath]);
    });

    describe('error handlers', () => {
        let consoleSpy: jest.SpyInstance;
        beforeAll(() => {
            consoleSpy = jest.spyOn(console, 'error').mockReturnValue();
        });
        beforeEach(() => {
            jest.clearAllMocks();
        });

        test('watch-project error', () => {
            // Arrange
            const clientMock = new (watchman.Client as jest.MockedClass<typeof watchman.Client>)();
            clientMock.command = jest.fn().mockImplementation((commands, callback) => {
                // Mock the response from the watch-project command
                // const resp = { watch: 'test-watch', relative_path: 'test-path' };
                callback('Test error', null);
            });

            // Act
            // eslint-disable-next-line no-new
            new FileWatcher('/path/to/project', onChangeMock);

            // Assert
            expect(consoleSpy).toHaveBeenCalledTimes(1);
            expect(consoleSpy).toHaveBeenCalledWith('Error initiating watch:', 'Test error');
            expect(clientMock.end as jest.Mock).toHaveBeenCalled();
        });

        test('subscribe error', () => {
            // Arrange
            const clientMock = new (watchman.Client as jest.MockedClass<typeof watchman.Client>)();
            clientMock.command = jest
                .fn()
                .mockImplementationOnce((commands, callback) => {
                    // Mock the response from the watch-project command
                    const resp = { watch: 'test-watch', relative_path: 'test-path' };
                    callback(null, resp);
                })
                .mockImplementationOnce((commands, callback) => {
                    callback('Test error', null);
                });

            // Act
            // eslint-disable-next-line no-new
            new FileWatcher('/path/to/project', onChangeMock);

            // Assert
            expect(consoleSpy).toHaveBeenCalledTimes(1);
            expect(consoleSpy).toHaveBeenCalledWith('Error subscribing to changes:', 'Test error');
            expect(clientMock.end as jest.Mock).toHaveBeenCalled();
        });
    });
});
