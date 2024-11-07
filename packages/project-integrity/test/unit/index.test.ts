import { initProject, checkProjectIntegrity } from '../../src';

test('Check public interface of module', () => {
    expect(typeof initProject).toBe('function');
    expect(typeof checkProjectIntegrity).toBe('function');
});
