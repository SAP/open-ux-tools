import { isReservedHost, webAddress, withReservedHost } from '../../src/spec/reserved-domains.js';

describe('reserved domains', () => {
    it.each([
        ['anna.berg@nordmail.se', 'anna.berg@example.com'],
        ['https://www.contoso-shop.com/p/1?x=2', 'https://www.example.com/p/1?x=2'],
        ['ftp://files.acme.co.uk:21/a', 'ftp://example.com:21/a'],
        ['www.acme.de', 'www.example.com'],
        ['WWW.ACME.DE/x', 'www.example.com/x']
    ])('puts the address %s in the documentation domain', (value, expected) => {
        // Given an address with a host anyone could register, Then it takes the documentation domain
        expect(withReservedHost(value)).toBe(expected);
        expect(isReservedHost(webAddress(expected)?.host ?? '')).toBe(true);
    });

    it.each([
        'a@b.test',
        'https://example.com',
        'https://shop.example.org/x',
        'http://localhost:8080/x',
        'http://192.168.0.1/x',
        'Contact anna@acme.de today',
        'v1.2.3',
        'Main St. 4'
    ])('keeps %s, which is reserved or no whole address', (value) => {
        // Given a reserved address or a value that is no address as a whole, Then it is kept
        expect(withReservedHost(value)).toBe(value);
    });
});
