import { jest } from '@jest/globals';

jest.unstable_mockModule('@sap-ux/btp-utils', () => ({
    isAppStudio: jest.fn()
}));

const index = await import('../../src/index.js');

describe('index', () => {
    it('test ', async () => {
        await expect(index).toBeDefined();
    });
});
