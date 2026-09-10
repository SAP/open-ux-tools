import axios from 'axios';

import { fetchPublicVersions, fetchInternalVersions } from '../../../src/ui5/fetch.js';
import { UI5_VERSIONS_CDN_URL, UI5_VERSIONS_NEO_CDN_URL } from '../../../src/base/constants/index.js';

import { buildFallbackMap } from '../../../src/index.js';

describe('ui5 fetchers', () => {
    const axiosGetMock = jest.spyOn(axios, 'get');

    beforeEach(() => {
        axiosGetMock.mockReset();
    });

    describe('fetchPublicVersions', () => {
        it('should return parsed data when the request is successful', async () => {
            const mockData = { latest: { version: '1.120.0' } };

            axiosGetMock.mockResolvedValue({ data: mockData });

            const result = await fetchPublicVersions();

            expect(axiosGetMock).toHaveBeenCalledWith(UI5_VERSIONS_CDN_URL, expect.any(Object));
            expect(result).toEqual(mockData);
        });

        it('should resolve to offline ui5 version fallbacks if the request fails', async () => {
            axiosGetMock.mockRejectedValue(new Error('Request failed with status code 500'));

            const versions = await fetchPublicVersions();

            expect(versions).toEqual(buildFallbackMap());
        });
    });

    describe('fetchInternalVersions', () => {
        it('should map internal versions and append latest label when matched', async () => {
            const latestVersion = '1.120.0';
            const mockResponse = {
                routes: [{ target: { version: '1.119.0' } }, { target: { version: '1.120.0' } }]
            };

            axiosGetMock.mockResolvedValue({ data: mockResponse });

            const result = await fetchInternalVersions(latestVersion);

            expect(axiosGetMock).toHaveBeenCalledWith(UI5_VERSIONS_NEO_CDN_URL, expect.any(Object));
            expect(result).toEqual(['1.119.0', '1.120.0 (latest)']);
        });
    });
});
