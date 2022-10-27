import { deploy, getCredentials, undeploy } from '../../../src/base/deploy';
import { BackendSystemKey } from '@sap-ux/store';

import { getInstance } from '@sap-ux/store/dist/services/backend-system';
jest.mock('@sap-ux/store/dist/services/backend-system', () =>  { return {
    getInstance: jest.fn().mockReturnValue({ read: () => { return {}} })
}});
const mockGetService = getInstance as jest.Mock

import { isAppStudio } from '@sap-ux/btp-utils';
jest.mock('@sap-ux/btp-utils', () => ({
    isAppStudio: jest.fn()
}));
const mockIsAppStudio = isAppStudio as jest.Mock;

describe('base/deploy', () => {
    const url ='http://target.example';
    const client = '001';

    describe('getCredentials', () => {
        // app studio - do nothing
        // happy flow
        // try without client fallback
        test('AppStudio - no place to get credentials', async () => {
            mockIsAppStudio.mockReturnValue(true);
            const credentials = await getCredentials({ url });
            expect(credentials).toBeUndefined();
        });

        test('read credentials from store', async () => {
            mockIsAppStudio.mockReturnValue(false);
            const credentials = await getCredentials({ url });
            expect(credentials).toBeDefined();
        });

        test('fallback read without client parameter', async () => {
            mockIsAppStudio.mockReturnValue(false);
            mockGetService.mockReturnValue({ read: (key: BackendSystemKey) => key.getId().includes(client) ? undefined : {} });
            const credentials = await getCredentials({ url, client });
            expect(credentials).toBeDefined();
        });
    });

    describe('deploy', () => {

        test('TBD', () => {
        });
    });

    describe('undeploy', () => {

        test('TBD', () => {
        });
    });

});