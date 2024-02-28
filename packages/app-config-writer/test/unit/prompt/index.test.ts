import * as prompt from '../../../src/prompt';

test('Smoke test', () => {
    expect(prompt).toBeDefined();
    expect(prompt.getSmartLinksTargetFromPrompt).toBeDefined();
    expect(prompt.promptUserPass).toBeDefined();
});
