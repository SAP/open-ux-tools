import path from 'path';

describe('index.ts', () => {
    it('should be able to import the module', () => {
        const indexPath = path.join(__dirname, '../../src/index.ts');
        expect(() => {
            // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
            const indexModule = require(indexPath);
            expect(indexModule).toBeDefined();
        }).not.toThrow();
    });

    it('should import FioriFunctionalityServer', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
        const { FioriFunctionalityServer } = require('../../src/server');
        expect(FioriFunctionalityServer).toBeDefined();
        expect(typeof FioriFunctionalityServer).toBe('function');
    });
});
