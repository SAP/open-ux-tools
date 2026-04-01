import type { IncomingMessage } from 'node:http';

import {
    createPathFilter,
    createProxyFilter,
    escapeRegExp,
    getMimeInfo,
    getRequestOrigin,
    isRequestFromApprouter,
    replaceUrl
} from '../../../src/proxy/utils';

describe('proxy utils', () => {
    describe('escapeRegExp', () => {
        test('escapes all regex metacharacters', () => {
            expect(escapeRegExp('a.b+c(d)')).toBe(String.raw`a\.b\+c\(d\)`);
        });

        test('returns alphanumeric string unchanged', () => {
            expect(escapeRegExp('logincallback')).toBe('logincallback');
        });
    });

    describe('replaceUrl', () => {
        test('replaces oldUrl with newUrl in text', () => {
            const text = 'Link: /backend/api/foo';
            const result = replaceUrl(text, '/backend/api/foo', '/proxy/api/foo');

            expect(result).toBe('Link: /proxy/api/foo');
        });

        test('returns text unchanged when oldUrl does not appear in text', () => {
            const text = 'Link: /other/path';
            const result = replaceUrl(text, '/backend/api/foo', '/proxy/api/foo');

            expect(result).toBe(text);
        });

        test('escapes regex-special characters in oldUrl', () => {
            const text = 'x (1) + y';
            const result = replaceUrl(text, '(1)', '[one]');

            expect(result).toBe('x [one] + y');
        });
    });

    describe('createPathFilter', () => {
        test('returns true for pathname matching a custom route', () => {
            const filter = createPathFilter(['/', '/login/callback'], []);

            expect(filter('/')).toBe(true);
            expect(filter('/login/callback')).toBe(true);
            expect(filter('/login/callback?foo=1')).toBe(true);
        });

        /**
         * Note: The .test TLD is reserved for testing (RFC 2606), so these are clearly non-real hostnames.
         */
        test('returns true for pathname matching a destination route regex', () => {
            const route = {
                sourcePattern: /^\/api\//,
                path: 'api/',
                url: 'http://backend.test:8080',
                source: '^/api/',
                destination: 'backend'
            };

            const filter = createPathFilter([], [route]);

            expect(filter('/api/foo')).toBe(true);
            expect(filter('/other')).toBe(false);
        });

        test('returns false when pathname matches neither custom routes nor destination routes', () => {
            const route = {
                sourcePattern: /^\/api\//,
                path: 'api/',
                url: 'http://backend.test:8080',
                source: '^/api/',
                destination: 'backend'
            };

            const filter = createPathFilter(['/login/callback'], [route]);

            expect(filter('/other')).toBe(false);
        });

        test('escapes regex metacharacters in custom routes', () => {
            const filter = createPathFilter(['/ext.v1+beta'], []);

            expect(filter('/ext.v1+beta')).toBe(true);
            expect(filter('/extXv1Xbeta')).toBe(false);
        });
    });

    describe('isRequestFromApprouter', () => {
        test('returns true when marker header is present', () => {
            const req = { headers: { 'x-backend-proxy-middleware-cf': '1' } } as unknown as IncomingMessage;
            expect(isRequestFromApprouter(req)).toBe(true);
        });

        test('returns false when marker header is absent', () => {
            const req = { headers: {} } as unknown as IncomingMessage;
            expect(isRequestFromApprouter(req)).toBe(false);
        });

        test('returns false when only x-forwarded-for is present (no marker)', () => {
            const req = { headers: { 'x-forwarded-for': '10.0.0.1' } } as unknown as IncomingMessage;
            expect(isRequestFromApprouter(req)).toBe(false);
        });
    });

    describe('createProxyFilter', () => {
        test('returns true for matching path when not from approuter', () => {
            const filter = createProxyFilter(['/login/callback'], []);
            const req = { headers: {} } as unknown as IncomingMessage;

            expect(filter('/login/callback', req)).toBe(true);
        });

        test('returns false for matching path when request has marker header', () => {
            const filter = createProxyFilter(['/login/callback'], []);
            const req = { headers: { 'x-backend-proxy-middleware-cf': '1' } } as unknown as IncomingMessage;

            expect(filter('/login/callback', req)).toBe(false);
        });

        test('returns false for non-matching path even when not from approuter', () => {
            const filter = createProxyFilter(['/login/callback'], []);
            const req = { headers: {} } as unknown as IncomingMessage;

            expect(filter('/other', req)).toBe(false);
        });

        test('allows requests with x-forwarded-for but no marker', () => {
            const filter = createProxyFilter(['/login/callback'], []);
            const req = { headers: { 'x-forwarded-for': '10.0.0.1, 127.0.0.1' } } as unknown as IncomingMessage;

            expect(filter('/login/callback', req)).toBe(true);
        });

        test('blocks requests with marker header even when x-forwarded-for is present', () => {
            const filter = createProxyFilter(['/login/callback'], []);
            const req = {
                headers: { 'x-forwarded-for': '10.0.0.1', 'x-backend-proxy-middleware-cf': '1' }
            } as unknown as IncomingMessage;

            expect(filter('/login/callback', req)).toBe(false);
        });
    });

    describe('getRequestOrigin', () => {
        test('uses x-forwarded-proto, x-forwarded-host and baseUrl when set', () => {
            const req = {
                headers: {
                    'x-forwarded-proto': 'https',
                    'x-forwarded-host': 'test-host.test'
                },
                baseUrl: '/webapp'
            };
            expect(getRequestOrigin(req as unknown as Parameters<typeof getRequestOrigin>[0])).toBe(
                'https://test-host.test/webapp'
            );
        });

        test('defaults to https when x-forwarded-proto is missing', () => {
            const req = {
                headers: { 'x-forwarded-host': 'test-host.test' },
                baseUrl: ''
            };
            expect(getRequestOrigin(req as unknown as Parameters<typeof getRequestOrigin>[0])).toBe(
                'https://test-host.test'
            );
        });

        test('takes first value when x-forwarded-proto contains a comma', () => {
            const req = {
                headers: {
                    'x-forwarded-proto': 'https,http',
                    'x-forwarded-host': 'test-host.test'
                },
                baseUrl: ''
            };
            expect(getRequestOrigin(req as unknown as Parameters<typeof getRequestOrigin>[0])).toBe(
                'https://test-host.test'
            );
        });
    });

    describe('getMimeInfo', () => {
        test('uses Content-Type header when provided', () => {
            const result = getMimeInfo('/x', 'text/html; charset=utf-8');

            expect(result.type).toBe('text/html');
            expect(result.charset).toBe('utf-8');
            expect(result.contentType).toContain('text/html');
        });

        test('uses pathname when ctValue is undefined', () => {
            const result = getMimeInfo('/index.html', undefined);

            expect(result.type).toBe('text/html');
            expect(result.contentType).toContain('charset=');
        });
    });
});
