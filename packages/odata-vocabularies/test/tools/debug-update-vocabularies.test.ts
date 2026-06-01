import { jest } from '@jest/globals';

jest.unstable_mockModule('axios', () => ({
    default: { get: jest.fn() },
    __esModule: true
}));

jest.unstable_mockModule('fs/promises', () => ({
    default: { mkdir: jest.fn(), writeFile: jest.fn() },
    mkdir: jest.fn(),
    writeFile: jest.fn(),
    __esModule: true
}));

jest.unstable_mockModule('prettier', () => ({
    default: { format: jest.fn(), resolveConfig: jest.fn() },
    format: jest.fn(),
    resolveConfig: jest.fn(),
    __esModule: true
}));

const Vocabularies = await import('../../tools/update');

// -----------------------------------------------------------------
// Please keep this test for easier debugging:
//
// Skipped by default. Enable for debugging, only!
// -----------------------------------------------------------------
it.skip('DEBUG ONLY: updateVocabularies', async () => {
    const vocabularies: any = await Vocabularies.updateVocabularies();
    expect(vocabularies).toBeTruthy();
});
