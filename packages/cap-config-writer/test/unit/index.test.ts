import * as capConfigWriter from '../../src/index.js';

test('Smoke test', () => {
    expect(capConfigWriter).toBeDefined();
    expect(typeof capConfigWriter.enableCdsUi5Plugin).toBe('function');
});
