import { exec } from 'child_process';
import { installDependencies } from '../../../src/utils/deps';

jest.mock('child_process', () => ({
    ...jest.requireActual('child_process'),
    exec: jest.fn()
}));

const execMock = exec as unknown as jest.Mock;

describe('installDependencies', () => {
    const dummyProjectPath = '/dummy/path';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should resolve when npm install succeeds', async () => {
        execMock.mockImplementation((command: string, callback: Function) => {
            callback(null, { stdout: 'ok', stderr: '' });
        });

        await expect(installDependencies(dummyProjectPath)).resolves.toBeUndefined();

        expect(exec).toHaveBeenCalledWith(`cd ${dummyProjectPath} && npm i`, expect.any(Function));
    });

    it('should throw an error when npm install fails', async () => {
        const error = new Error('Installation failed');
        execMock.mockImplementation((command: string, callback: Function) => {
            callback(error, null);
        });

        await expect(installDependencies(dummyProjectPath)).rejects.toThrow('Installation of dependencies failed.');
    });
});
