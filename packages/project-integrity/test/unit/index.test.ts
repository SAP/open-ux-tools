import {
    initFioriProject,
    initProject,
    checkFioriProjectIntegrity,
    checkProjectIntegrity,
    updateFioriProjectIntegrity,
    updateProjectIntegrity
} from '../../src';

test('Check public interface for project integrity', () => {
    expect(typeof initProject).toBe('function');
    expect(typeof checkProjectIntegrity).toBe('function');
    expect(typeof updateProjectIntegrity).toBe('function');
});

test('Check public interface for Fiori project integrity', () => {
    expect(typeof initFioriProject).toBe('function');
    expect(typeof checkFioriProjectIntegrity).toBe('function');
    expect(typeof updateFioriProjectIntegrity).toBe('function');
});
