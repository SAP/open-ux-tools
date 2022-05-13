import { ToolsLogger, NullTransport } from '@sap-ux/logger';
import { convertAppDescriptorToManifest } from '../../src/ext/bsp';

describe('bsp', () => {
    const logger = new ToolsLogger({
        transports: [new NullTransport()]
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('convertAppDescriptorToManifest', () => {
        const rewrite = convertAppDescriptorToManifest('/my/bsp');
        expect(rewrite('/my/bsp/manifest.appdescr')).toBe('/manifest.json');
        expect(rewrite('/another/manifest.appdescr')).toBe('/another/manifest.appdescr');
        expect(rewrite('/my/bsp/test')).toBe('/my/bsp/test');
        expect(rewrite('/test')).toBe('/test');
    });
});
