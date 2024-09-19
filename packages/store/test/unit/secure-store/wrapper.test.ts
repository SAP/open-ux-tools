import { Wrapper } from '../../../src/secure-store/wrapper';
import { Logger } from '@sap-ux/logger';
import { execSync } from 'child_process';
import { platform } from 'os';

jest.mock('os', () => ({
    ...jest.requireActual('os'),
    platform: jest.fn(),
}));

jest.mock('child_process', () => ({
    execSync: jest.fn()
}));

const mockLogger: Logger = {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
} as unknown as Logger;

const macPlatform = 'darwin';
const windowsPlatform = 'win32';
const linuxPlatform = 'linux';

describe('Wrapper', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('save', () => {
        it('should store a secret on macOS', async () => {
            (platform as jest.Mock).mockReturnValue(macPlatform);
            const service = 'testService';
            const key = 'testKey';
            const value = { username: 'testUser', password: 'testPass' };

            const wrapper: Wrapper = new Wrapper(mockLogger);
            const result = await wrapper.save(service, key, value);
            expect(execSync).toHaveBeenCalledWith(
                `security add-generic-password -s ${service} -a ${key} -w ${JSON.stringify(value)}`
            );
            expect(result).toBe(true);
        });

        it('should store a secret on Windows', async () => {
            (platform as jest.Mock).mockReturnValue(windowsPlatform);
            const wrapper: Wrapper = new Wrapper(mockLogger);
            const service = 'testService';
            const key = 'testKey';
            const value = { username: 'testUser', password: 'testPass' };

            const result = await wrapper.save(service, key, value);
            expect(execSync).toHaveBeenCalledWith(
                `cmdkey /generic:${service} /user:${key} /pass:${JSON.stringify(value)}`
            );
            expect(result).toBe(true);
        });

        it('should log an error if storing a secret fails', async () => {
            (platform as jest.Mock).mockReturnValue(linuxPlatform);
            (execSync as jest.Mock).mockImplementation(() => {
                throw new Error('Failed to store secret');
            });

            const service = 'testService';
            const key = 'testKey';
            const value = { username: 'testUser', password: 'testPass' };
            
            const wrapper: Wrapper = new Wrapper(mockLogger);
            const result = await wrapper.save(service, key, value);

            expect(result).toBe(false);
            expect(mockLogger.error).toHaveBeenCalledWith(
                expect.stringContaining('Error storing secret')
            );
        });
    });

    describe('retrieve', () => {
        it('should retrieve a secret on macOS', async () => {
            (platform as jest.Mock).mockReturnValue(macPlatform);
            const service = 'testService';
            const key = 'testKey';

            (execSync as jest.Mock).mockReturnValue(Buffer.from(JSON.stringify({ username: 'testUser', password: 'testPass' })));

            const wrapper: Wrapper = new Wrapper(mockLogger);
            const result = await wrapper.retrieve(service, key);

            expect(execSync).toHaveBeenCalledWith(`security find-generic-password -s ${service} -a ${key} -w`);
            expect(result).toEqual({ username: 'testUser', password: 'testPass' });
        });

        test('should retrieve secret on Windows', async () => {
            (platform as jest.Mock).mockReturnValue(windowsPlatform);
            const service = 'testService';
            const key = 'testKey';

            (execSync as jest.Mock).mockReturnValue(Buffer.from(JSON.stringify({ username: 'testUser', password: 'testPass' })));
            const wrapper: Wrapper = new Wrapper(mockLogger);
            const result = await wrapper.retrieve(service, key);

            expect(execSync).toHaveBeenCalledWith(`cmdkey /list:${service}`);
            expect(result).toEqual({ username: 'testUser', password: 'testPass' });
        });
    
        test('should retrieve secret on Linux', async () => {
            (platform as jest.Mock).mockReturnValue(linuxPlatform);
            const service = 'testService';
            const key = 'testKey';

            (execSync as jest.Mock).mockReturnValue(Buffer.from(JSON.stringify({ username: 'testUser', password: 'testPass' })));
            const wrapper: Wrapper = new Wrapper(mockLogger);
            const result = await wrapper.retrieve(service, key);

            expect(execSync).toHaveBeenCalledWith(`secret-tool lookup service ${key}`);
            expect(result).toEqual({ username: 'testUser', password: 'testPass' });
        });
    

        it('should log an error if retrieving a secret fails', async () => {
            (platform as jest.Mock).mockReturnValue(linuxPlatform);
            (execSync as jest.Mock).mockImplementation(() => {
                throw new Error('Failed to retrieve secret');
            });

            const service = 'testService';
            const key = 'testKey';

            const wrapper: Wrapper = new Wrapper(mockLogger);
            const result = await wrapper.retrieve(service, key);

            expect(result).toBeUndefined();
            expect(mockLogger.error).toHaveBeenCalledWith(
                expect.stringContaining('Error retrieving secret')
            );
        });
    });

    describe('delete', () => {

        it('should delete a secret on macOS', async () => {
            (platform as jest.Mock).mockReturnValue(macPlatform);
            const service = 'testService';
            const key = 'testKey';

            const wrapper: Wrapper = new Wrapper(mockLogger);
            await wrapper.delete(service, key);

            expect(execSync).toHaveBeenCalledWith(`security delete-generic-password -s ${service} -a ${key}`);
        });

        it('should delete a secret on windows', async () => {
            (platform as jest.Mock).mockReturnValue(windowsPlatform);
            const service = 'testService';
            const key = 'testKey';

            const wrapper: Wrapper = new Wrapper(mockLogger);
            await wrapper.delete(service, key);

            expect(execSync).toHaveBeenCalledWith(`cmdkey /delete:${service}`);
        });

        it('should delete a secret on linux', async () => {
            (platform as jest.Mock).mockReturnValue(linuxPlatform);
            const service = 'testService';
            const key = 'testKey';

            const wrapper: Wrapper = new Wrapper(mockLogger);
            await wrapper.delete(service, key);

            expect(execSync).toHaveBeenCalledWith(`secret-tool clear service ${key}`);
        });

        it('should log an error if deleting a secret fails', async () => {
            (platform as jest.Mock).mockReturnValue(windowsPlatform);
            (execSync as jest.Mock).mockImplementation(() => {
                throw new Error('Failed to delete secret');
            });

            const service = 'testService';
            const key = 'testKey';

            const wrapper: Wrapper = new Wrapper(mockLogger);
            const result = await wrapper.delete(service, key);

            expect(result).toBe(false);
            expect(mockLogger.error).toHaveBeenCalledWith(
                expect.stringContaining('Error deleting secret')
            );
        });
    });

    describe('getAll', () => {
        it('should retrieve all secrets on macOS', async () => {
            (platform as jest.Mock).mockReturnValue(macPlatform);
            const service = 'testService';
            (execSync as jest.Mock)
                .mockReturnValueOnce(Buffer.from(`"acct"<blob>="testKey"\n"acct"<blob>="anotherKey"`))
                .mockReturnValueOnce(Buffer.from(JSON.stringify({ username: 'testUser' })))
                .mockReturnValueOnce(Buffer.from(JSON.stringify({ username: 'anotherUser' })));

            const wrapper: Wrapper = new Wrapper(mockLogger);
            const result = await wrapper.getAll(service);

            expect(execSync).toHaveBeenCalledWith(
                `security find-generic-password -s ${service} -g 2>&1 | grep 'acct'`
            );
            expect(result).toEqual({
                testKey: { username: 'testUser' },
                anotherKey: { username: 'anotherUser' }
            });
        });

        it('should retrieve all secrets on Windows', async () => {
            (platform as jest.Mock).mockReturnValue(windowsPlatform);
        
            // Mock the output for the Windows command
            (execSync as jest.Mock)
                .mockReturnValueOnce(Buffer.from('Target:testService/testKey\nTarget:testService/anotherKey'))
                .mockReturnValueOnce(Buffer.from(JSON.stringify({ username: 'testUser' })))
                .mockReturnValueOnce(Buffer.from(JSON.stringify({ username: 'anotherUser' })));
        
            const wrapper = new Wrapper(mockLogger);
            const result = await wrapper.getAll('testService');
        
            expect(execSync).toHaveBeenCalledWith(
                `cmdkey /list`
            );
        
            expect(result).toEqual({
                'testService/testKey': { username: 'testUser' },
                'testService/anotherKey': { username: 'anotherUser' }
            });
        });

        it('should retrieve all secrets on Linux', async () => {
            (platform as jest.Mock).mockReturnValue(linuxPlatform);
        
            // Mock the output for the Linux command
            (execSync as jest.Mock)
                .mockReturnValueOnce(Buffer.from('testKey\nanotherKey'))
                .mockReturnValueOnce(Buffer.from(JSON.stringify({ username: 'testUser' })))
                .mockReturnValueOnce(Buffer.from(JSON.stringify({ username: 'anotherUser' })));
        
            const wrapper = new Wrapper(mockLogger);
            const result = await wrapper.getAll('testService');
        
            expect(execSync).toHaveBeenCalledWith(
                `secret-tool search service testService`
            );
        
            expect(result).toEqual({
                'testKey': { username: 'testUser' },
                'anotherKey': { username: 'anotherUser' }
            });
        });
        
        it('should log an error if getting all secrets fails', async () => {
            (platform as jest.Mock).mockReturnValue(linuxPlatform);
            (execSync as jest.Mock).mockImplementation(() => {
                throw new Error('Failed to get secrets');
            });

            const service = 'testService';
            const wrapper: Wrapper = new Wrapper(mockLogger);
            const result = await wrapper.getAll(service);

            expect(result).toEqual({});
            expect(mockLogger.error).toHaveBeenCalledWith(
                expect.stringContaining('Error getting values for service')
            );
        });
    });
});
