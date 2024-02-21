import { FileWatcher } from '../../../src/base/watcher';
import chokidar from 'chokidar';

jest.mock('chokidar', () => ({
    watch: jest.fn()
}));

describe('FileWatcher', () => {
    let mockWatcher: any;
    let onChangeMock: jest.Mock;
    let consoleLogSpy: jest.SpyInstance;
    let consoleErrorSpy: jest.SpyInstance;

    beforeEach(() => {
        jest.resetModules();
        mockWatcher = {
            on: jest.fn()
        };
        jest.mock('chokidar', () => ({
            watch: jest.fn(() => mockWatcher)
        }));
        onChangeMock = jest.fn();
        consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should watch for file changes and invoke onChange callback', () => {
        const projectPath = '/path/to/project';

        // Mock the chokidar watcher
        const mockWatcher = {
            on: jest.fn()
        };
        (chokidar.watch as jest.Mock).mockReturnValue(mockWatcher);

        // Create FileWatcher instance
        new FileWatcher(projectPath, onChangeMock);

        // Check if 'ready' event handler is registered
        const readyHandlers = mockWatcher.on.mock.calls.filter((args: any) => args[0] === 'ready');
        expect(readyHandlers.length).toBe(1);

        // Call the 'ready' event handler directly
        readyHandlers.forEach((args: any) => {
            args[1](); // Call the 'ready' event handler
        });

        // Simulate 'change' event
        let changeHandler = mockWatcher.on.mock.calls.find((args: any) => args[0] === 'change')[1];
        changeHandler('file/path.change');

        // Simulate 'change' event json file
        changeHandler = mockWatcher.on.mock.calls.find((args: any) => args[0] === 'change')[1];
        changeHandler('file/path.json');
        // Expect onChange callback to be called with the changed file path
        expect(onChangeMock).toHaveBeenCalledWith(['file/path.json']);

        // Simulate 'change' event json file
        changeHandler = mockWatcher.on.mock.calls.find((args: any) => args[0] === 'change')[1];
        changeHandler('file/path.properties');
        // Expect onChange callback to be called with the changed file path
        expect(onChangeMock).toHaveBeenCalledWith(['file/path.properties']);

        // Simulate 'add' event
        const addHandler = mockWatcher.on.mock.calls.find((args: any) => args[0] === 'add')[1];
        addHandler('new/file.change');
        expect(consoleLogSpy).toHaveBeenCalledWith(`File new/file.change has been added`);
        expect(onChangeMock).toHaveBeenCalledWith(['new/file.change']);

        // Simulate 'unlink' event
        const unlinkHandler = mockWatcher.on.mock.calls.find((args: any) => args[0] === 'unlink')[1];
        unlinkHandler('deleted/file.change');
        expect(consoleLogSpy).toHaveBeenCalledWith(`File deleted/file.change has been deleted`);
        expect(onChangeMock).toHaveBeenCalledWith(['deleted/file.change']);
    });

    it('should log an error when an error occurs while watching files', () => {
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        const projectPath = '/path/to/project';

        // Mock the chokidar watcher
        const mockWatcher = {
            on: jest.fn()
        };
        (chokidar.watch as jest.Mock).mockReturnValue(mockWatcher);

        // Create FileWatcher instance
        new FileWatcher(projectPath, jest.fn());

        // Simulate 'error' event
        const errorHandler = mockWatcher.on.mock.calls.find((args: any) => args[0] === 'error')[1];
        errorHandler(new Error('Test error'));

        // Expect console.error to be called with the error message
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error occurred while watching files:', expect.any(Error));
    });
});
