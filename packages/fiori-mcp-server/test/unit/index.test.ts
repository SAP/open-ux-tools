import path from 'path';

describe('index.ts', () => {
    it('should be able to import the module', () => {
        const indexPath = path.join(__dirname, '../../src/index.ts');
        expect(() => {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-require-imports
            const indexModule = require(indexPath);
            expect(indexModule).toBeDefined();
        }).not.toThrow();
    });

    it('should import FioriFunctionalityServer', () => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-require-imports
        const { FioriFunctionalityServer } = require('../../src/server');
        expect(FioriFunctionalityServer).toBeDefined();
        expect(typeof FioriFunctionalityServer).toBe('function');
    });
});
