import nock from 'nock';
import {
    ABAPVirtualHostProvider,
    VIRTUAL_HOST_API_NOT_SUPPORTED
} from '../../../src/auth/reentrance-ticket/abap-virtual-host-provider';

describe('ABAPVirtualHostProvider', () => {
    const backendOrigin = 'https://backend.com';
    const virtualHosts = {
        relatedUrls: {
            API: 'https://some.api.host',
            UI: 'https://some.web.host/ui'
        }
    };

    beforeEach(() => {
        nock(backendOrigin)
            .get('/sap/public/bc/icf/virtualhost')
            .reply(200, virtualHosts)
            .get('/sap/public/bc/icf/logoff')
            .reply(200);
    });

    it('Should retrieve ui and api host name from virtual hosts endpoint', async () => {
        const vhp = new ABAPVirtualHostProvider(`${backendOrigin}/some/path?foo=bar&baz=quux`);
        expect(await vhp.uiHostname()).toEqual('https://some.web.host');
        expect(await vhp.apiHostname()).toEqual(virtualHosts.relatedUrls.API);
    });

    it('should use virtual ui host name for logoff', async () => {
        const vhp = new ABAPVirtualHostProvider(`${backendOrigin}/some/path?foo=bar&baz=quux`);
        const logoffURL = new URL(await vhp.logoffUrl());
        expect(logoffURL.origin).toEqual('https://some.web.host');
    });

    it('should throw VIRTUAL_HOST_API_NOT_SUPPORTED when response is missing relatedUrls', async () => {
        nock.cleanAll();
        nock(backendOrigin).get('/sap/public/bc/icf/virtualhost').reply(200, {});
        const vhp = new ABAPVirtualHostProvider(backendOrigin);
        await expect(vhp.uiHostname()).rejects.toThrow(VIRTUAL_HOST_API_NOT_SUPPORTED);
    });

    it('should throw VIRTUAL_HOST_API_NOT_SUPPORTED when response has partial relatedUrls (missing UI)', async () => {
        nock.cleanAll();
        nock(backendOrigin)
            .get('/sap/public/bc/icf/virtualhost')
            .reply(200, { relatedUrls: { API: 'https://some.api.host' } });
        const vhp = new ABAPVirtualHostProvider(backendOrigin);
        await expect(vhp.uiHostname()).rejects.toThrow(VIRTUAL_HOST_API_NOT_SUPPORTED);
    });

    it('should throw VIRTUAL_HOST_API_NOT_SUPPORTED when response is not JSON (e.g. HTML)', async () => {
        nock.cleanAll();
        nock(backendOrigin)
            .get('/sap/public/bc/icf/virtualhost')
            .reply(200, '<html><body>Not found</body></html>', { 'content-type': 'text/html' });
        const vhp = new ABAPVirtualHostProvider(backendOrigin);
        await expect(vhp.uiHostname()).rejects.toThrow(VIRTUAL_HOST_API_NOT_SUPPORTED);
    });
});
