import { mergeEffectiveOptions, DEFAULT_REWRITE_CONTENT_TYPES } from '../../../src/config';

describe('config', () => {
    describe('mergeEffectiveOptions', () => {
        test('returns defaults when given empty configuration', () => {
            const result = mergeEffectiveOptions({ xsappJsonPath: './xs-app.json' });
            expect(result.debug).toBe(false);
            expect(result.port).toBe(5000);
            expect(result.xsappJsonPath).toBe('./xs-app.json');
            expect(result.destinations).toEqual([]);
            expect(result.allowServices).toBe(false);
            expect(result.authenticationMethod).toBe('none');
            expect(result.allowLocalDir).toBe(false);
            expect(result.rewriteContent).toBe(true);
            expect(result.rewriteContentTypes).toEqual(DEFAULT_REWRITE_CONTENT_TYPES);
            expect(result.appendAuthRoute).toBe(false);
            expect(result.disableWelcomeFile).toBe(false);
            expect(result.extensions).toEqual([]);
        });

        test('overrides defaults with configuration', () => {
            const result = mergeEffectiveOptions({
                xsappJsonPath: './custom/xs-app.json',
                debug: true,
                port: 3000,
                authenticationMethod: 'route'
            });
            expect(result.xsappJsonPath).toBe('./custom/xs-app.json');
            expect(result.debug).toBe(true);
            expect(result.port).toBe(3000);
            expect(result.authenticationMethod).toBe('route');
        });
    });
});
