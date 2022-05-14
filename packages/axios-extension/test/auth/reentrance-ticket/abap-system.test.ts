import { ABAPSystem } from '@src/auth/reentrance-ticket/abap-system';

describe('ABAPSystem', () => {
    describe('uiHostname()', () => {
        it('removes -api from the first label of hostname, multiple labels', () => {
            expect(new ABAPSystem('http://first-api.second.third/some/path?foo=bar&baz=quux').uiHostname()).toBe(
                'http://first.second.third'
            );
        });

        it('removes -api from the first label of hostname, single label', () => {
            expect(new ABAPSystem('http://first-api/some/path?foo=bar&baz=quux').uiHostname()).toBe('http://first');
        });
        it('removes -api from the first label of hostname, multiple labels, with port', () => {
            expect(new ABAPSystem('http://first-api.second.third:50000/some/path?foo=bar&baz=quux').uiHostname()).toBe(
                'http://first.second.third:50000'
            );
        });

        it('removes -api from the first label of hostname, single label, with port', () => {
            expect(new ABAPSystem('http://first-api:50000/some/path?foo=bar&baz=quux').uiHostname()).toBe(
                'http://first:50000'
            );
        });

        it('multiple labels, no -api, hostname unchanged', () => {
            expect(new ABAPSystem('http://first.second.third/some/path?foo=bar&baz=quux').uiHostname()).toBe(
                'http://first.second.third'
            );
        });

        it('single label, no -api, hostname unchanged', () => {
            expect(new ABAPSystem('http://first/some/path?foo=bar&baz=quux').uiHostname()).toBe('http://first');
        });
        it('multiple labels, with port number, no -api, hostname unchanged', () => {
            expect(new ABAPSystem('http://first.second.third:50000/some/path?foo=bar&baz=quux').uiHostname()).toBe(
                'http://first.second.third:50000'
            );
        });

        it('single label, with port number, no -api, hostname unchanged', () => {
            expect(new ABAPSystem('http://first:50000/some/path?foo=bar&baz=quux').uiHostname()).toBe(
                'http://first:50000'
            );
        });
    });
    describe('apiHostname()', () => {
        it('adds -api to the first label of hostname, multiple labels', () => {
            expect(new ABAPSystem('http://first.second.third/some/path?foo=bar&baz=quux').apiHostname()).toBe(
                'http://first-api.second.third'
            );
        });

        it('adds -api to the first label of hostname, single label', () => {
            expect(new ABAPSystem('http://first-api/some/path?foo=bar&baz=quux').apiHostname()).toBe(
                'http://first-api'
            );
        });
        it('adds -api to the first label of hostname, multiple labels, with port', () => {
            expect(new ABAPSystem('http://first-api.second.third:50000/some/path?foo=bar&baz=quux').apiHostname()).toBe(
                'http://first-api.second.third:50000'
            );
        });

        it('adds -api to the first label of hostname, single label, with port', () => {
            expect(new ABAPSystem('http://first-api:50000/some/path?foo=bar&baz=quux').apiHostname()).toBe(
                'http://first-api:50000'
            );
        });

        it('multiple labels, has -api, hostname unchanged', () => {
            expect(new ABAPSystem('http://first-api.second.third/some/path?foo=bar&baz=quux').apiHostname()).toBe(
                'http://first-api.second.third'
            );
        });

        it('single label, has -api, hostname unchanged', () => {
            expect(new ABAPSystem('http://first-api/some/path?foo=bar&baz=quux').apiHostname()).toBe(
                'http://first-api'
            );
        });
        it('multiple labels, with port number, has -api, hostname unchanged', () => {
            expect(new ABAPSystem('http://first-api.second.third:50000/some/path?foo=bar&baz=quux').apiHostname()).toBe(
                'http://first-api.second.third:50000'
            );
        });

        it('single label, with port number, has -api, hostname unchanged', () => {
            expect(new ABAPSystem('http://first-api:50000/some/path?foo=bar&baz=quux').apiHostname()).toBe(
                'http://first-api:50000'
            );
        });
    });
    describe('logoffUrl()', () => {
        it('uses UI hostname, given API url', () => {
            const url = 'http://first-api.second.third/some/path?foo=bar&baz=quux';
            const logoffURL = new URL(new ABAPSystem(url).logoffUrl());
            expect(logoffURL.origin).toBe(new ABAPSystem(url).uiHostname());
        });

        it('uses UI hostname, given a non-API url', () => {
            const url = 'http://first.second.third/some/path?foo=bar&baz=quux';
            const logoffURL = new URL(new ABAPSystem(url).logoffUrl());
            expect(logoffURL.origin).toBe(new ABAPSystem(url).uiHostname());
        });
    });
});
