import { describe, expect, test } from '@jest/globals';
import {
    requireAppPath,
    requireObject,
    requireSite,
    requireString,
    requireStringArray
} from '../../../../src/tools/run-rta-workflow-step/assertions.js';

describe('assertions', () => {
    describe('requireString', () => {
        test('returns the value when present and non-empty', () => {
            expect(requireString({ key: 'value' }, 'key')).toBe('value');
        });

        test.each([undefined, null, '', 0, false, {}, []])('throws when value is %j', (val) => {
            expect(() => requireString({ key: val } as Record<string, unknown>, 'key')).toThrow(
                'payload.key is required and must be a non-empty string'
            );
        });

        test('throws when key is absent', () => {
            expect(() => requireString({}, 'missing')).toThrow(
                'payload.missing is required and must be a non-empty string'
            );
        });

        test('throws when payload is undefined', () => {
            expect(() => requireString(undefined, 'key')).toThrow(
                'payload.key is required and must be a non-empty string'
            );
        });
    });

    describe('requireAppPath', () => {
        test('returns the value when non-empty', () => {
            expect(requireAppPath('/project/root')).toBe('/project/root');
        });

        test.each([undefined, ''])('throws when value is %j', (val) => {
            expect(() => requireAppPath(val)).toThrow('appPath is required for this step');
        });
    });

    describe('requireObject', () => {
        test('returns the value when it is a plain object', () => {
            const obj = { a: 1 };
            expect(requireObject({ key: obj }, 'key')).toBe(obj);
        });

        test.each([undefined, null, '', 0, []])('throws when value is %j', (val) => {
            expect(() => requireObject({ key: val } as Record<string, unknown>, 'key')).toThrow(
                'payload.key is required and must be an object'
            );
        });
    });

    describe('requireStringArray', () => {
        test('returns the array when all items are non-empty strings', () => {
            expect(requireStringArray({ key: ['a', 'b'] }, 'key')).toEqual(['a', 'b']);
        });

        test('throws when value is not an array', () => {
            expect(() => requireStringArray({ key: 'string' }, 'key')).toThrow(
                'payload.key is required and must be a non-empty array of non-empty strings'
            );
        });

        test('throws when the array is empty', () => {
            expect(() => requireStringArray({ key: [] }, 'key')).toThrow(
                'payload.key is required and must be a non-empty array of non-empty strings'
            );
        });

        test('throws when the array contains an empty string', () => {
            expect(() => requireStringArray({ key: ['a', ''] }, 'key')).toThrow(
                'payload.key is required and must be a non-empty array of non-empty strings'
            );
        });

        test('throws when the array contains a non-string item', () => {
            expect(() => requireStringArray({ key: ['a', 42] } as Record<string, unknown>, 'key')).toThrow(
                'payload.key is required and must be a non-empty array of non-empty strings'
            );
        });
    });

    describe('requireSite', () => {
        test.each(['http://localhost:8080', 'https://localhost:8080', 'http://127.0.0.1:3000', 'http://[::1]:8080'])(
            'accepts valid loopback URL %s',
            (site) => {
                expect(requireSite(site)).toBe(site);
            }
        );

        test('throws when site is undefined', () => {
            expect(() => requireSite(undefined)).toThrow('site is required for this step');
        });

        test('throws when site is empty', () => {
            expect(() => requireSite('')).toThrow('site is required for this step');
        });

        test('throws when site is not a valid URL', () => {
            expect(() => requireSite('not-a-url')).toThrow('site must be a valid URL');
        });

        test('throws when protocol is not http(s)', () => {
            expect(() => requireSite('ftp://localhost:21')).toThrow('site must be an http:// or https:// URL');
        });

        test.each(['http://example.com', 'http://192.168.1.1'])('throws when host is not loopback: %s', (site) => {
            expect(() => requireSite(site)).toThrow('site must point to localhost, 127.0.0.1 or ::1');
        });
    });
});
