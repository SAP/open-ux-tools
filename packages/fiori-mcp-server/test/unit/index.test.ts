import { FioriFunctionalityServer } from '../../src/server';

describe('index.ts', () => {
    it('should export FioriFunctionalityServer', () => {
        expect(FioriFunctionalityServer).toBeDefined();
        expect(typeof FioriFunctionalityServer).toBe('function');
    });

    it('should create a server instance', () => {
        const server = new FioriFunctionalityServer();
        expect(server).toBeInstanceOf(FioriFunctionalityServer);
    });
});
