import type { TemplateConfig } from '../../../src/base/flp';
import { FlpSandbox as FlpSandboxUnderTest } from '../../../src/base/flp';
import type { FlpConfig } from '../../../src/types';

class FlpSandbox extends FlpSandboxUnderTest {
    public templateConfig: TemplateConfig;
    public readonly config: FlpConfig;
}

describe('FlpSandbox', () => {
    describe('single app', () => {
        test('default (no) config', () => {
            const flp = new FlpSandbox({}, {} as any, {} as any, {} as any);
            expect(flp.config.apps).toBeDefined();
            expect(flp.config.apps).toHaveLength(0);
            expect(flp.config.path).toBe('/test/flpSandbox.html');
            expect(flp.router).toBeDefined();
        });
    });
});
