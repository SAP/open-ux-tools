import { validateVersion, toMtaModuleName, runCommand } from '../../src/utils';
import { MTAVersion } from '../../src/constants';
import { CommandRunner } from '@sap-ux/nodejs-utils';

describe('CF utils', () => {
    beforeAll(async () => {
        jest.clearAllMocks();
    });

    afterAll(async () => {
        jest.resetAllMocks();
    });

    describe('Utils methods', () => {
        test('Validate - validateVersion', async () => {
            expect(() => validateVersion('0.0.0')).toThrow();
            expect(() => validateVersion('~Version')).toThrow();
            expect(() => validateVersion()).not.toThrow();
            expect(validateVersion(MTAVersion)).toBeTruthy();
            expect(validateVersion('1')).toBeTruthy();
        });

        test('Validate - toMtaModuleName', () => {
            expect(toMtaModuleName('0.0.0')).toEqual('000');
            expect(toMtaModuleName('cf_mta_id')).toEqual('cf_mta_id');
            expect(toMtaModuleName('cf.mta.00')).toEqual('cfmta00');
            expect(toMtaModuleName('cf_mta.!£$%^&*,()')).toEqual('cf_mta');
        });

        test('Validate - runCommand', async () => {
            const mockRun = jest.fn();
            jest.spyOn(CommandRunner.prototype, 'run').mockImplementation(mockRun);

            // Test successful command execution
            mockRun.mockResolvedValueOnce('success');
            await expect(runCommand('/test/path', 'npm', ['install'], 'Install failed:')).resolves.not.toThrow();
            expect(mockRun).toHaveBeenCalledWith('npm', ['install'], { cwd: '/test/path' });

            // Test failed command execution with error message
            const errorMessage = 'Command execution failed';
            mockRun.mockRejectedValueOnce(new Error(errorMessage));
            await expect(runCommand('/test/path', 'npm', ['build'], 'Build failed:')).rejects.toThrow(
                `Build failed: ${errorMessage}`
            );

            // Test failed command execution with non-Error object
            mockRun.mockRejectedValueOnce('Unknown error');
            await expect(runCommand('/test/path', 'npm', ['test'], 'Test failed:')).rejects.toThrow(
                'Test failed: Unknown error'
            );

            jest.restoreAllMocks();
        });
    });
});
