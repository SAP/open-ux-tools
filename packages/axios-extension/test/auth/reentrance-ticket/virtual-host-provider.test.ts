import nock from 'nock';
import { ABAPVirtualHostProvider } from '../../../src/auth/reentrance-ticket/abap-virtual-host-provider';

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
});
