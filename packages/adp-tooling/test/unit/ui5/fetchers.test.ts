import { fetchPublicVersions, fetchInternalVersions } from '../../../src/ui5/fetch';
import { UI5_VERSIONS_CDN_URL, UI5_VERSIONS_NEO_CDN_URL } from '../../../src/base/constants';

import { fetchMock } from '../../__mock__/global';

describe('fetchers', () => {
    beforeEach(() => {
        fetchMock.mockClear();
    });

    describe('fetchPublicVersions', () => {
        it('should return parsed JSON when fetch is successful', async () => {
            const mockData = { latest: { version: '1.120.0' } };

            fetchMock.mockResolvedValue({
                ok: true,
                json: async () => mockData
            });

            const result = await fetchPublicVersions();

            expect(fetchMock).toHaveBeenCalledWith(UI5_VERSIONS_CDN_URL);
            expect(result).toEqual(mockData);
        });

        it('should throw an error if fetch fails (non-ok response)', async () => {
            fetchMock.mockResolvedValue({
                ok: false,
                status: 500
            });

            await expect(fetchPublicVersions()).rejects.toThrow('Failed to fetch public UI5 versions. Status: 500');
        });
    });

    describe('fetchInternalVersions', () => {
        it('should map internal versions and append latest label when matched', async () => {
            const latestVersion = '1.120.0';
            const mockResponse = {
                routes: [{ target: { version: '1.119.0' } }, { target: { version: '1.120.0' } }]
            };

            fetchMock.mockResolvedValue({
                json: async () => mockResponse
            });

            const result = await fetchInternalVersions(latestVersion);

            expect(fetchMock).toHaveBeenCalledWith(UI5_VERSIONS_NEO_CDN_URL);
            expect(result).toEqual(['1.119.0', '1.120.0 (latest)']);
        });
    });
});
