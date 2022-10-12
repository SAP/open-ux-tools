import { checkEnvironment } from '../src';

test('Smoke test', () => {
    expect(typeof checkEnvironment === 'function').toBeTruthy();
});
