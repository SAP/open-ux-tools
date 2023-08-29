import nock from 'nock';
import { ApiEndpoints, RequestMethod, request } from '../../../../src/preview/client/api-handler';

const backend = 'https://sap.example';

describe('API Handler', () => {
    describe('request', () => {
        afterAll(() => {
            nock.restore();
        });

        test('GET - returns correct data', async () => {
            nock(backend).get(ApiEndpoints.FRAGMENT).reply(200).persist(true);
            try {
                const data = await request(ApiEndpoints.FRAGMENT, RequestMethod.GET);
                expect(data);
            } catch (e) {
                expect(e.message).toBe('Test should have failed!');
            }
        });
    });
});
