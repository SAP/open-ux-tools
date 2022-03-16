import { Uaa } from '../../src/auth/uaa';
import axios from 'axios';
import { NullTransport, ToolsLogger } from '@sap-ux/logger';

describe('UAA', () => {
    const nullLogger = new ToolsLogger({ transports: [new NullTransport()] });
    const uaaInstance = ({ url }: { url: string } = { url: 'someUaa' }) => {
        return new Uaa(
            {
                uaa: { url, clientid: '100', clientsecret: 'secret' },
                url: 'someUrl',
                catalogs: { abap: { path: 'abap_path', type: 'some_type' } }
            },
            nullLogger
        );
    };

    describe('getUserInfo', () => {
        it('Makes a GET request to /userinfo endpoint', async () => {
            const mockRequest = jest.spyOn(axios, 'request').mockResolvedValueOnce(undefined);
            const uaaUrl = 'https://someuaa';

            await uaaInstance({ url: uaaUrl }).getUserInfo('someToken');

            expect(mockRequest).toBeCalledWith(expect.objectContaining({ url: uaaUrl + '/userinfo', method: 'GET' }));
        });

        it('Uses the token passed in for auth', async () => {
            const mockRequest = jest.spyOn(axios, 'request').mockResolvedValueOnce(undefined);
            const token = 'someToken';

            await uaaInstance().getUserInfo(token);

            expect(mockRequest).toBeCalledWith(
                expect.objectContaining({
                    headers: expect.objectContaining({ authorization: expect.stringContaining(token) })
                })
            );
        });

        it.each([
            { response: undefined, expectedUserInfo: undefined },
            { response: { data: undefined }, expectedUserInfo: undefined },
            { response: { data: { email: 'email' } }, expectedUserInfo: 'email' },
            { response: { data: { name: 'name' } }, expectedUserInfo: 'name' },
            { response: { data: { email: 'email', name: 'name' } }, expectedUserInfo: 'email' }
        ])('Returns email/user if available', async ({ response, expectedUserInfo }) => {
            jest.spyOn(axios, 'request').mockResolvedValueOnce(response);

            await expect(uaaInstance().getUserInfo('someToken')).resolves.toEqual(expectedUserInfo);
        });
    });
});
