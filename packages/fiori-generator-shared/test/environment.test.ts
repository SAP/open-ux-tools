import { getHostEnvironment, hostEnvironment } from '../src/environment';

describe('getHostEnvironment', () => {
    it('should return the host for CLI environment', () => {
        process.argv = ['/path', '/usr/local/bin/yo'];
        const result = getHostEnvironment();
        expect(result).toEqual(hostEnvironment.cli);
    });
});
