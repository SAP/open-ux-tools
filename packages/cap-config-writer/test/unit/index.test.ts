import * as capConfigWriter from '../../src';

test('Smoke test', () => {
    expect(capConfigWriter).toBeDefined();
    expect(typeof capConfigWriter.checkCdsUi5PluginEnabled).toBe('function');
    expect(typeof capConfigWriter.enabledCdsUi5Plugin).toBe('function');
});
