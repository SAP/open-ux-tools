import type { EnityName } from '../../src';
import { getService } from '../../src';
import { Entities } from '../../src/data-provider/constants';
import * as i18n from '../../src/i18n';

describe('store', () => {
    describe('getService', () => {
        it('initializes i18n resources', async () => {
            const mockInitI18n = jest.spyOn(i18n, 'initI18n');
            await getService({ entityName: Entities.BackendSystem });
            expect(mockInitI18n).toHaveBeenCalled();
        });

        it('returns a truthy object for a valid entity', async () => {
            await expect(getService({ entityName: Entities.BackendSystem })).resolves.toBeTruthy();
        });

        it('throws an error for an invalid entity name', async () => {
            const expectedMessage = i18n.text('error.unsupportedEntity', { entityName: 'foo' });
            await expect(getService({ entityName: 'foo' as EnityName })).rejects.toThrow(expectedMessage);
        });
    });
});
