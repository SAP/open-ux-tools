import * as appConfigWriter from '../../src';

test('Smoke test', () => {
    expect(appConfigWriter).toBeDefined();
    expect(appConfigWriter.generateSmartLinksConfig).toBeDefined();
    expect(appConfigWriter.getSmartLinksTargetFromPrompt).toBeDefined();
});
