import { getHostEnvironment, hostEnvironment } from '../src/environment';
import { isAppStudio } from '@sap-ux/btp-utils';

jest.mock('@sap-ux/btp-utils', () => ({
    ...jest.requireActual('@sap-ux/btp-utils'),
    isAppStudio: jest.fn()
}));

describe('getHostEnvironment', () => {
    it('should return the host for CLI environment', () => {
        const isYUI = false;
        const result = getHostEnvironment(isYUI);
        expect(result).toEqual(hostEnvironment.cli);
    });

    it('should return the host for App Studio environment', () => {
        const isYUI = true;
        (isAppStudio as jest.Mock).mockReturnValue(true);
        const result = getHostEnvironment(isYUI);
        expect(result).toEqual(hostEnvironment.bas);
    });

    it('should return the host for VSCode environment', () => {
        const isYUI = true;
        (isAppStudio as jest.Mock).mockReturnValue(false);
        const result = getHostEnvironment(isYUI);
        expect(result).toEqual(hostEnvironment.vscode);
    });
});
