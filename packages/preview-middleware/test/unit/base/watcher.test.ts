// FileWatcher.test.ts

import { FileWatcher } from '../../../src/base/watcher';
import * as watchman from 'fb-watchman';

jest.mock('fb-watchman');

describe('FileWatcher', () => {
    it('should handle file changes', () => {
        // Arrange
        const onChangeMock = jest.fn();

        const clientMock = new (watchman.Client as jest.MockedClass<typeof watchman.Client>)();
        (watchman.Client as jest.MockedClass<typeof watchman.Client>).mockImplementation(() => clientMock);
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
        const fileWatcher = new FileWatcher('/path/to/project', onChangeMock);

        // Call the FileWatcher methods that trigger the subscription and file change events
        fileWatcher['client'].emit('subscription', {});

        // Assert
        expect(onChangeMock).toHaveBeenCalledWith(['/path/to/project/example.change']);
    });

    it('should add paths to ignorePaths set', () => {
        // Arrange
        const fileWatcher = new FileWatcher('/path/to/project', jest.fn());

        const filePath1 = '/path/to/project/file1.txt';
        fileWatcher.addIgnorePath(filePath1);

        expect(fileWatcher['ignorePaths'].has(filePath1)).toBe(true);

        // ACT
        const filePath2 = '/path/to/project/file2.txt';
        fileWatcher.addIgnorePath(filePath2);

        // Assert
        expect(fileWatcher['ignorePaths'].has(filePath1)).toBe(true);
        expect(fileWatcher['ignorePaths'].has(filePath2)).toBe(true);
    });
});
