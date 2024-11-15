import { isAppStudio } from '@sap-ux/btp-utils';
import { getPlatform, PLATFORMS } from '../../src/prompts/utils';

jest.mock('@sap-ux/btp-utils', () => ({
    isAppStudio: jest.fn()
}));

const mockIsAppStudio = isAppStudio as jest.Mock;

describe('prompt utils', () => {
    describe('getPlatform', () => {
        let originalMainModule: NodeJS.Module | undefined;
        let originalStdinIsTTY: boolean | undefined;

        beforeEach(() => {
            // Save the original values of process.mainModule and process.stdin.isTTY
            originalMainModule = process.mainModule;
            originalStdinIsTTY = process.stdin.isTTY;

            // Mock process.mainModule and process.stdin.isTTY to prevent interference
            Object.defineProperty(process, 'mainModule', {
                value: undefined,
                writable: true
            });
            Object.defineProperty(process.stdin, 'isTTY', {
                value: undefined,
                writable: true
            });
        });

        afterEach(() => {
            // Restore the original values
            Object.defineProperty(process, 'mainModule', {
                value: originalMainModule,
                writable: true
            });
            Object.defineProperty(process.stdin, 'isTTY', {
                value: originalStdinIsTTY,
                writable: true
            });
        });

        it('should return CLI if process.mainModule.filename contains "yo"', () => {
            Object.defineProperty(process, 'mainModule', {
                value: { filename: '/path/to/yo-some-file.js' },
                writable: true
            });

            const platform = getPlatform();
            expect(platform).toEqual(PLATFORMS.CLI);
        });

        it('should return CLI if process.stdin.isTTY is true', () => {
            Object.defineProperty(process.stdin, 'isTTY', {
                value: true,
                writable: true
            });

            const platform = getPlatform();
            expect(platform).toEqual(PLATFORMS.CLI);
        });

        it('should return SBAS if isAppStudio() returns true', () => {
            mockIsAppStudio.mockReturnValue(true);

            const platform = getPlatform();
            expect(platform).toEqual(PLATFORMS.SBAS);
            expect(isAppStudio).toHaveBeenCalled();
        });

        it('should return VS Code if isAppStudio() returns false', () => {
            mockIsAppStudio.mockReturnValue(false);

            const platform = getPlatform();
            expect(platform).toEqual(PLATFORMS.VSCODE);
            expect(isAppStudio).toHaveBeenCalled();
        });
    });
});
