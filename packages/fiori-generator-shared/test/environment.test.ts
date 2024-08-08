import { getHostEnvironment, hostEnvironment } from '../src/environment';
import { isAppStudio } from '@sap-ux/btp-utils';

jest.mock('@sap-ux/btp-utils', () => ({
    ...jest.requireActual('@sap-ux/btp-utils'),
    isAppStudio: jest.fn()
}));

describe('getHostEnvironment', () => {
    it('should return the host for CLI environment', () => {
        process.argv = ['/path', '/usr/local/bin/yo'];
        const result = getHostEnvironment();
        expect(result).toEqual(hostEnvironment.cli);
    });
});
