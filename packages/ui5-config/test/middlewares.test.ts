import { getPreviewMiddlewareConfig } from '../src/middlewares';

describe('getPreviewMiddlewareConfig', () => {
    it('should return a valid preview middleware config', () => {
        const previewMiddlewareOpts = {
            ui5Theme: 'sap_fiori_3',
            localStartFile: 'test/flpSandbox.html',
            appId: 'app1',
            flpAction: 'tile'
        };
        const result = getPreviewMiddlewareConfig(previewMiddlewareOpts);
        expect(result.name).toBe('fiori-tools-preview');
        expect(result.afterMiddleware).toBe('fiori-tools-appreload');
        expect(result.configuration.flp.theme).toBe('sap_fiori_3');
        expect(result.configuration.flp.path).toBe('test/flpSandbox.html');
        expect(result.configuration.flp.intent).toEqual({
            object: 'app1',
            action: 'tile'
        });
    });

    it('should handle empty options', () => {
        const result = getPreviewMiddlewareConfig({});
        expect(result).toBeDefined();
        expect(result.name).toBe('fiori-tools-preview');
        expect(result.configuration.flp.theme).toBeUndefined();
        expect(result.configuration.flp.path).toBeUndefined();
    });
});
