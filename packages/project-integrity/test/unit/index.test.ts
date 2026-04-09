import { jest } from '@jest/globals';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const lzString = require('lz-string');

jest.unstable_mockModule('lz-string', () => ({
    default: lzString,
    compressToBase64: lzString.compressToBase64,
    decompressFromBase64: lzString.decompressFromBase64
}));

const {
    initFioriProject,
    initProject,
    isFioriProjectIntegrityInitialized,
    checkFioriProjectIntegrity,
    checkProjectIntegrity,
    updateFioriProjectIntegrity,
    updateProjectIntegrity
} = await import('../../src');

test('Check public interface for project integrity', () => {
    expect(typeof initProject).toBe('function');
    expect(typeof checkProjectIntegrity).toBe('function');
    expect(typeof updateProjectIntegrity).toBe('function');
});

test('Check public interface for Fiori project integrity', () => {
    expect(typeof initFioriProject).toBe('function');
    expect(typeof checkFioriProjectIntegrity).toBe('function');
    expect(typeof updateFioriProjectIntegrity).toBe('function');
    expect(typeof isFioriProjectIntegrityInitialized).toBe('function');
});
