import { jest } from '@jest/globals';
import { type UrlAbapTarget, isUrlTarget } from '@sap-ux/system-access';
import type { AbapDeployConfig } from '../../../src/types/index.js';

const mockIsAppStudio = jest.fn<() => boolean>().mockReturnValue(false);

const realBtpUtils = await import('@sap-ux/btp-utils');
jest.unstable_mockModule('@sap-ux/btp-utils', () => ({
    ...realBtpUtils,
    isAppStudio: mockIsAppStudio
}));

const { getConfigForLogging, validateConfig, excludePatternToRegExp, isExcluded, warnOnLegacyRegexExcludes } =
    await import('../../../src/base/config.js');

describe('base/config', () => {
    test('isUrlTarget', () => {
        expect(isUrlTarget({ url: '~url' })).toBe(true);
        expect(isUrlTarget({ destination: '~destination' })).toBe(false);
    });

    describe('excludePatternToRegExp', () => {
        test('directory prefix pattern matches everything beneath it', () => {
            const re = excludePatternToRegExp('/test/');
            expect(re.test('test/foo.js')).toBe(true);
            expect(re.test('test/sub/bar.js')).toBe(true);
            expect(re.test('mytest/foo.js')).toBe(false);
        });

        test('leading slash is optional when matching', () => {
            expect(excludePatternToRegExp('/ext/').test('ext/foo.js')).toBe(true);
            expect(excludePatternToRegExp('ext/').test('ext/foo.js')).toBe(true);
        });

        test('regex metacharacters are matched literally', () => {
            const re = excludePatternToRegExp('/test.dir/');
            expect(re.test('test.dir/file.js')).toBe(true);
            expect(re.test('testXdir/file.js')).toBe(false);
        });

        test('globstar matches across path segments', () => {
            const re = excludePatternToRegExp('/test/**');
            expect(re.test('test/a/b/c.js')).toBe(true);
        });

        test('single star stays within a segment', () => {
            const re = excludePatternToRegExp('/test/*.js');
            expect(re.test('test/app.js')).toBe(true);
            expect(re.test('test/sub/app.js')).toBe(false);
        });

        test('file glob is anchored to the end', () => {
            const re = excludePatternToRegExp('/Component.js');
            expect(re.test('Component.js')).toBe(true);
            expect(re.test('Component.js.bak')).toBe(false);
        });

        test('globstar file glob matches at any depth', () => {
            const re = excludePatternToRegExp('/**/*.map');
            expect(re.test('sub/dir/app.js.map')).toBe(true);
            expect(re.test('sub/dir/app.js')).toBe(false);
        });
    });

    describe('isExcluded', () => {
        test('returns true when any pattern matches', () => {
            expect(isExcluded('test/foo.js', ['/localService/**', '/test/'])).toBe(true);
        });

        test('returns false when no pattern matches', () => {
            expect(isExcluded('keep/foo.js', ['/localService/**', '/test/'])).toBe(false);
        });

        test('returns false for an empty pattern list', () => {
            expect(isExcluded('keep/foo.js', [])).toBe(false);
        });
    });

    describe('warnOnLegacyRegexExcludes', () => {
        test('warns for entries that look like regular expressions', () => {
            const logger = { warn: jest.fn() } as any;
            warnOnLegacyRegexExcludes(['.*\\.map$', '^src/', 'foo$', 'a\\.b'], logger);
            expect(logger.warn).toHaveBeenCalledTimes(4);
        });

        test('does not warn for glob/path patterns', () => {
            const logger = { warn: jest.fn() } as any;
            warnOnLegacyRegexExcludes(['/test/', '/test/**', '/**/*.map', '/Component.js', 'ext/'], logger);
            expect(logger.warn).not.toHaveBeenCalled();
        });

        test('no-op without a logger', () => {
            expect(() => warnOnLegacyRegexExcludes(['.*\\.map$'])).not.toThrow();
        });
    });

    describe('getConfigForLogging', () => {
        test('no credentials included', () => {
            const config = {
                app: {
                    name: 'world'
                }
            } as AbapDeployConfig;
            const configForLogging = getConfigForLogging(config);
            expect(configForLogging).toBe(config);
        });
        test('credentials are being removed', () => {
            const config = {
                app: {
                    name: 'world'
                },
                credentials: {
                    username: '~user',
                    password: '~password'
                }
            } as AbapDeployConfig;
            const configForLogging = getConfigForLogging(config);
            expect(configForLogging.credentials).toBe('hidden');
            expect(configForLogging.app).toEqual(config.app);
        });
    });

    describe('validateConfig', () => {
        const validConfig = {
            app: {
                name: '~name',
                desription: '~description',
                package: '~package',
                transport: '~transport'
            },
            target: {
                url: 'http://target.example'
            } as UrlAbapTarget
        };

        const mockLogger = { warn: jest.fn() } as any;

        beforeEach(() => {
            mockLogger.warn.mockClear();
        });

        test('valid config', () => {
            mockIsAppStudio.mockReturnValueOnce(false);
            expect(() => validateConfig(validConfig)).not.toThrow();
            mockIsAppStudio.mockReturnValueOnce(true);
            expect(() => validateConfig({ app: validConfig.app, target: { destination: '~dest' } })).not.toThrow();
        });

        test('config missing', () => {
            expect(() => validateConfig(undefined)).toThrow();
        });

        test('incorrect app', () => {
            const config = { app: { ...validConfig.app }, target: validConfig.target };
            delete (config as any).app;
            expect(() => validateConfig(config)).toThrow();
        });

        test('incorrect target', () => {
            const config = { app: validConfig.app, target: { ...validConfig.target } };
            delete (config.target as any).url;
            mockIsAppStudio.mockReturnValueOnce(false);
            expect(() => validateConfig(config)).toThrow('target-url');
            mockIsAppStudio.mockReturnValueOnce(true);
            expect(() => validateConfig(config)).toThrow('target-destination');
            delete (config as any).target;
            expect(() => validateConfig(config)).toThrow('target');
        });

        test('zeros added to client', () => {
            const config = { app: validConfig.app, target: { ...validConfig.target } };
            config.target.client = '1';
            validateConfig(config);
            expect(config.target.client).toBe('001');
        });

        test('lowercase package is normalized to uppercase and warning is logged', () => {
            const config = {
                app: { ...validConfig.app, package: '$tmp' },
                target: { ...validConfig.target }
            };
            validateConfig(config, mockLogger);
            expect(config.app.package).toBe('$TMP');
            expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining("'$tmp' was normalized to '$TMP'"));
        });

        test('mixed-case package is normalized to uppercase and warning is logged', () => {
            const config = {
                app: { ...validConfig.app, package: 'MyPackage' },
                target: { ...validConfig.target }
            };
            validateConfig(config, mockLogger);
            expect(config.app.package).toBe('MYPACKAGE');
            expect(mockLogger.warn).toHaveBeenCalledTimes(1);
        });

        test('already-uppercase package is left unchanged and no warning is logged', () => {
            const config = {
                app: { ...validConfig.app, package: '$TMP' },
                target: { ...validConfig.target }
            };
            validateConfig(config, mockLogger);
            expect(config.app.package).toBe('$TMP');
            expect(mockLogger.warn).not.toHaveBeenCalled();
        });

        test('normalization works without a logger (no crash)', () => {
            const config = {
                app: { ...validConfig.app, package: '$tmp' },
                target: { ...validConfig.target }
            };
            expect(() => validateConfig(config)).not.toThrow();
            expect(config.app.package).toBe('$TMP');
        });
    });
});
