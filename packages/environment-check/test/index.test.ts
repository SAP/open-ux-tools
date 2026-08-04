import { checkEnvironment } from '../src/index.js';

test('Smoke test', () => {
    expect(typeof checkEnvironment === 'function').toBeTruthy();
});
