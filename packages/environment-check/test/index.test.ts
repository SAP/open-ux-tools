import { checkBASEnvironment } from '../src';

test('Smoke test', () => {
    expect(typeof checkBASEnvironment === 'function').toBeTruthy();
});
