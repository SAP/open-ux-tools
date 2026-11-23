import { describe, it, expect } from '@jest/globals';
import { cleanupBackendNullUrls, setWebappPath, setAppreloadPath, setProxyUI5Version } from '../../../src/data/yaml.js';

describe('data/yaml', () => {
    describe('cleanupBackendNullUrls', () => {
        it('should replace null URLs with empty strings in backend configuration', () => {
            const ui5YamlJson = {
                server: {
                    customMiddleware: [
                        {
                            name: 'fiori-tools-proxy',
                            configuration: {
                                backend: [
                                    { url: null, path: '/sap' },
                                    { url: 'https://example.com', path: '/api' }
                                ]
                            }
                        }
                    ]
                }
            };

            cleanupBackendNullUrls(ui5YamlJson);

            expect(ui5YamlJson.server.customMiddleware[0].configuration.backend[0].url).toBe('');
            expect(ui5YamlJson.server.customMiddleware[0].configuration.backend[1].url).toBe('https://example.com');
        });

        it('should handle missing server configuration gracefully', () => {
            const ui5YamlJson = {};
            expect(() => cleanupBackendNullUrls(ui5YamlJson)).not.toThrow();
        });

        it('should handle missing customMiddleware gracefully', () => {
            const ui5YamlJson = { server: {} };
            expect(() => cleanupBackendNullUrls(ui5YamlJson)).not.toThrow();
        });

        it('should skip non-fiori-tools-proxy middleware', () => {
            const ui5YamlJson = {
                server: {
                    customMiddleware: [
                        {
                            name: 'other-middleware',
                            configuration: {
                                backend: [{ url: null }]
                            }
                        }
                    ]
                }
            };

            cleanupBackendNullUrls(ui5YamlJson);

            // URL should still be null since middleware name doesn't match
            expect(ui5YamlJson.server.customMiddleware[0].configuration.backend[0].url).toBeNull();
        });

        it('should handle null/undefined ui5YamlJson gracefully', () => {
            expect(() => cleanupBackendNullUrls(null)).not.toThrow();
            expect(() => cleanupBackendNullUrls(undefined)).not.toThrow();
        });
    });

    describe('setWebappPath', () => {
        it('should set webapp path when different from default', () => {
            const ui5YamlJson: Record<string, unknown> = {};

            setWebappPath(ui5YamlJson, 'src/main/webapp');

            expect(ui5YamlJson.resources).toEqual({
                configuration: {
                    paths: {
                        webapp: 'src/main/webapp'
                    }
                }
            });
        });

        it('should not set resources when webapp path is default', () => {
            const ui5YamlJson: Record<string, unknown> = {};

            setWebappPath(ui5YamlJson, 'webapp');

            expect(ui5YamlJson.resources).toBeUndefined();
        });
    });

    describe('setAppreloadPath', () => {
        it('should set path for fiori-tools-appreload middleware', () => {
            const ui5YamlJson = {
                server: {
                    customMiddleware: [
                        {
                            name: 'fiori-tools-appreload',
                            configuration: {
                                path: 'webapp'
                            }
                        }
                    ]
                }
            };

            setAppreloadPath(ui5YamlJson, 'src/main/webapp');

            expect(ui5YamlJson.server.customMiddleware[0].configuration.path).toBe('src/main/webapp');
        });

        it('should handle missing server configuration gracefully', () => {
            const ui5YamlJson = {};
            expect(() => setAppreloadPath(ui5YamlJson, 'webapp')).not.toThrow();
        });

        it('should skip middleware without configuration', () => {
            const ui5YamlJson = {
                server: {
                    customMiddleware: [
                        {
                            name: 'fiori-tools-appreload'
                            // no configuration
                        }
                    ]
                }
            };

            expect(() => setAppreloadPath(ui5YamlJson, 'webapp')).not.toThrow();
        });

        it('should skip non-appreload middleware', () => {
            const ui5YamlJson = {
                server: {
                    customMiddleware: [
                        {
                            name: 'other-middleware',
                            configuration: { path: 'original' }
                        }
                    ]
                }
            };

            setAppreloadPath(ui5YamlJson, 'new-path');

            expect(ui5YamlJson.server.customMiddleware[0].configuration.path).toBe('original');
        });
    });

    describe('setProxyUI5Version', () => {
        it('should set UI5 version for fiori-tools-proxy middleware', () => {
            const ui5YamlJson = {
                server: {
                    customMiddleware: [
                        {
                            name: 'fiori-tools-proxy',
                            configuration: {
                                ui5: { version: '1.96.0' }
                            }
                        }
                    ]
                }
            };

            setProxyUI5Version(ui5YamlJson, '1.120.0');

            expect(ui5YamlJson.server.customMiddleware[0].configuration.ui5.version).toBe('1.120.0');
        });

        it('should handle undefined version', () => {
            const ui5YamlJson = {
                server: {
                    customMiddleware: [
                        {
                            name: 'fiori-tools-proxy',
                            configuration: {
                                ui5: { version: '1.96.0' }
                            }
                        }
                    ]
                }
            };

            setProxyUI5Version(ui5YamlJson, undefined);

            expect(ui5YamlJson.server.customMiddleware[0].configuration.ui5.version).toBeUndefined();
        });

        it('should handle missing server configuration gracefully', () => {
            const ui5YamlJson = {};
            expect(() => setProxyUI5Version(ui5YamlJson, '1.120.0')).not.toThrow();
        });

        it('should skip non-proxy middleware', () => {
            const ui5YamlJson = {
                server: {
                    customMiddleware: [
                        {
                            name: 'other-middleware',
                            configuration: {
                                ui5: { version: '1.96.0' }
                            }
                        }
                    ]
                }
            };

            setProxyUI5Version(ui5YamlJson, '1.120.0');

            expect(ui5YamlJson.server.customMiddleware[0].configuration.ui5.version).toBe('1.96.0');
        });
    });
});
