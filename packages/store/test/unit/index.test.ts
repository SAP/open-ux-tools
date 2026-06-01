import { jest } from '@jest/globals';
import type { EnityName } from '../../src';

// Import actual text function BEFORE mocking
const actualI18n = await import('../../src/i18n');
const actualText = actualI18n.text;

const mockInitI18n = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);

jest.unstable_mockModule('../../src/i18n', () => ({
    initI18n: mockInitI18n,
    text: (...args: any[]) => actualText(...args)
}));

const { getService } = await import('../../src');
const { Entities } = await import('../../src/data-provider/constants');

describe('store', () => {
    describe('getService', () => {
        it('initializes i18n resources', async () => {
            await getService({ entityName: Entities.BackendSystem, options: { baseDirectory: 'foo' } });
            expect(mockInitI18n).toHaveBeenCalled();
        });

        it('returns a truthy object for a valid entity', async () => {
            await expect(
                getService({ entityName: Entities.BackendSystem, options: { baseDirectory: 'foo' } })
            ).resolves.toBeTruthy();
        });

        it('throws an error for an invalid entity name', async () => {
            const expectedMessage = actualText('error.unsupportedEntity', { entityName: 'foo' });
            await expect(getService({ entityName: 'foo' as EnityName })).rejects.toThrow(expectedMessage);
        });
    });
});
