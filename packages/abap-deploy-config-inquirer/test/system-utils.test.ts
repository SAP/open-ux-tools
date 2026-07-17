import { describe, it, expect } from '@jest/globals';
import { isValidSystemConfig, areSystemConfigEquals } from '../src/system-utils.js';

describe('system-utils', () => {
    describe('isValidSystemConfig', () => {
        it('should return false when config is undefined', () => {
            expect(isValidSystemConfig(undefined)).toBe(false);
        });

        it('should return false when config has no url and no destination', () => {
            expect(isValidSystemConfig({})).toBe(false);
        });

        it('should return false when url and destination are empty strings', () => {
            expect(isValidSystemConfig({ url: '', destination: '' })).toBe(false);
        });

        it('should return true when config has a url', () => {
            expect(isValidSystemConfig({ url: 'https://example.com' })).toBe(true);
        });

        it('should return true when config has a destination', () => {
            expect(isValidSystemConfig({ destination: 'MY_DEST' })).toBe(true);
        });

        it('should return true when config has both url and destination', () => {
            expect(isValidSystemConfig({ url: 'https://example.com', destination: 'MY_DEST' })).toBe(true);
        });
    });

    describe('areSystemConfigEquals', () => {
        it('should return false when configA is undefined', () => {
            expect(areSystemConfigEquals(undefined, { url: 'https://example.com' })).toBe(false);
        });

        it('should return false when configB is undefined', () => {
            expect(areSystemConfigEquals({ url: 'https://example.com' }, undefined)).toBe(false);
        });

        it('should return false when both configs are undefined', () => {
            expect(areSystemConfigEquals(undefined, undefined)).toBe(false);
        });

        it('should return false when configA is invalid', () => {
            expect(areSystemConfigEquals({}, { url: 'https://example.com' })).toBe(false);
        });

        it('should return false when configB is invalid', () => {
            expect(areSystemConfigEquals({ url: 'https://example.com' }, {})).toBe(false);
        });

        it('should return true for identical configs', () => {
            const config = { url: 'https://example.com', client: '100', destination: 'MY_DEST' };
            expect(areSystemConfigEquals(config, { ...config })).toBe(true);
        });

        it.each([
            ['trailing slash', 'https://example.com/'],
            ['whitespace', '  https://example.com  '],
            ['whitespace and trailing slash', ' https://example.com/ ']
        ])('should return true when urls differ only by %s', (_label, url) => {
            const configA = { url };
            const configB = { url: 'https://example.com' };
            expect(areSystemConfigEquals(configA, configB)).toBe(true);
        });

        it('should return false when urls are different', () => {
            const configA = { url: 'https://example.com' };
            const configB = { url: 'https://other.com' };
            expect(areSystemConfigEquals(configA, configB)).toBe(false);
        });

        it('should return false when clients are different', () => {
            const configA = { url: 'https://example.com', client: '100' };
            const configB = { url: 'https://example.com', client: '200' };
            expect(areSystemConfigEquals(configA, configB)).toBe(false);
        });

        it('should return false when destinations are different', () => {
            const configA = { destination: 'DEST_A' };
            const configB = { destination: 'DEST_B' };
            expect(areSystemConfigEquals(configA, configB)).toBe(false);
        });

        it('should return true for configs with only matching destinations', () => {
            const configA = { destination: 'MY_DEST' };
            const configB = { destination: 'MY_DEST' };
            expect(areSystemConfigEquals(configA, configB)).toBe(true);
        });

        it('should treat undefined and missing client as equal', () => {
            const configA = { url: 'https://example.com', client: undefined };
            const configB = { url: 'https://example.com' };
            expect(areSystemConfigEquals(configA, configB)).toBe(true);
        });
    });
});
