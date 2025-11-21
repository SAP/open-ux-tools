import { analyzeApp } from '../src';

describe('analyzeApp', () => {
    it('returns not-implemented status while collectors are placeholders', async () => {
        const result = await analyzeApp({ appPath: '/tmp/non-existent' });
        expect(result.status).toBe('not-implemented');
    });
});
