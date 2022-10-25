import {
    filterCompressedHtmlFiles,
    getCorporateProxyServer,
    getHtmlFile,
    getManifest,
    getWebAppFolderFromYaml,
    getYamlFile,
    hideProxyCredentials,
    injectUI5Url,
    proxyRequestHandler,
    proxyResponseHandler,
    setHtmlResponse,
    proxyErrorHandler,
    updateProxyEnv
} from '../../src/base/utils';
import type { Response } from 'express';
import YAML from 'yaml';
import fs from 'fs';
import * as baseUtils from '../../src/base/utils';
import type { ProxyConfig } from '../../src/base/types';
import type { IncomingMessage } from 'http';
import { NullTransport, ToolsLogger } from '@sap-ux/logger';

describe('Utils', () => {
    const existsMock = jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    const readFileMock = jest.spyOn(fs, 'readFileSync').mockReturnValue('');
    const logger = new ToolsLogger({
        transports: [new NullTransport()]
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('proxyResponseHandler: sets Etag and cache-control headers to response', () => {
        const proxyRes = {
            headers: {} as any
        };
        const etag = 'W/MyEtag';
        proxyResponseHandler(proxyRes as any, etag);
        expect(proxyRes.headers['Etag']).toEqual(etag);
        expect(proxyRes.headers['cache-control']).toEqual('no-cache');
    });

    test('proxyRequestHandler: log requests and immediately send response, if resource is cached', () => {
        const etag = 'W/MyEtag';
        const proxyReq = {
            path: '/mypath',
            getHeader: () => {
                return etag;
            }
        };
        const res = {
            statusCode: undefined,
            end: jest.fn()
        };
        const logger = {
            info: jest.fn()
        };
        proxyRequestHandler(proxyReq as any, res as any, etag, logger as any);
        expect(logger.info).toHaveBeenCalledTimes(1);
        expect(logger.info).toHaveBeenCalledWith('/mypath');
        expect(res.statusCode).toEqual(304);
        expect(res.end).toHaveBeenCalledTimes(1);
    });

    test('proxyErrorHandler', () => {
        const mockNext = jest.fn();
        const request = {} as IncomingMessage;
        const requestWithNext = {
            next: mockNext as Function
        } as IncomingMessage & { next: Function };
        const requestCausingError = {
            originalUrl: 'my/request/.error'
        } as IncomingMessage & { originalUrl?: string };
        const debugSpy = jest.spyOn(logger, 'debug');

        // do nothing if no error is provided, but log for debug purposes
        proxyErrorHandler(undefined as unknown as Error, request, logger);
        expect(debugSpy).toBeCalled();

        // forward or throw other errors
        const otherError = new Error();
        proxyErrorHandler(otherError, requestWithNext, logger);
        expect(mockNext).toBeCalledTimes(1);
        try {
            proxyErrorHandler(otherError, request, logger);
        } catch (error) {
            expect(error).toBe(otherError);
        }

        // ignore empty errors
        debugSpy.mockReset();
        const emptyError = { message: '', stack: 'Error' } as Error;
        proxyErrorHandler(emptyError, requestCausingError, logger);
        expect(debugSpy).toBeCalledTimes(1);
        expect(debugSpy).toBeCalledWith(
            `Error ${JSON.stringify(emptyError, null, 2)} thrown for request ${requestCausingError.originalUrl}`
        );
    });

    describe('getCorporateProxyServer', () => {
        const corporateProxy = 'https://myproxy.example:8443';

        test('get value from CLI (wins over input and env)', () => {
            const envProxy = process.env.npm_config_proxy;
            const envHttpsProxy = process.env.npm_config_https_proxy;
            process.env.npm_config_proxy = '~not.used';
            process.env.npm_config_https_proxy = '~not.used';
            process.argv.push(`proxy=${corporateProxy}`);
            expect(getCorporateProxyServer('~not.used')).toEqual(corporateProxy);
            process.argv.pop();
            process.env.npm_config_proxy = envProxy;
            process.env.npm_config_https_proxy = envHttpsProxy;
        });
        test('get value from env (wins over input)', () => {
            const envProxy = process.env.npm_config_proxy;
            const envHttpsProxy = process.env.npm_config_https_proxy;
            process.env.npm_config_proxy = corporateProxy;
            process.env.npm_config_https_proxy = corporateProxy;
            expect(getCorporateProxyServer('~not.used')).toEqual(corporateProxy);
            process.env.npm_config_proxy = envProxy;
            process.env.npm_config_https_proxy = envHttpsProxy;
        });
        test('get value from env if there is no input', () => {
            const envProxy = process.env.npm_config_proxy;
            const envHttpsProxy = process.env.npm_config_https_proxy;
            process.env.npm_config_proxy = corporateProxy;
            process.env.npm_config_https_proxy = corporateProxy;
            expect(getCorporateProxyServer(undefined)).toEqual(corporateProxy);
            process.env.npm_config_proxy = envProxy;
            process.env.npm_config_https_proxy = envHttpsProxy;
        });
        test('get value from input if there is no env', () => {
            const envProxy = process.env.npm_config_proxy;
            const envHttpsProxy = process.env.npm_config_https_proxy;
            delete process.env.npm_config_proxy;
            delete process.env.npm_config_https_proxy;
            expect(getCorporateProxyServer(corporateProxy)).toEqual(corporateProxy);
            process.env.npm_config_proxy = envProxy;
            process.env.npm_config_https_proxy = envHttpsProxy;
        });
    });

    describe('updateProxyEnv', () => {
        const corporateProxy = 'https://myproxy.example:8443';
        afterEach(() => {
            delete process.env.npm_config_proxy;
            delete process.env.npm_config_https_proxy;
        });

        test('set value from CLI (wins over input)', () => {
            process.argv.push(`proxy=${corporateProxy}`);
            updateProxyEnv('~not.used');
            expect(process.env.npm_config_proxy).toEqual(corporateProxy);
            expect(process.env.npm_config_https_proxy).toEqual(corporateProxy);
            process.argv.pop();
        });
        test('set value from input if there is no env)', () => {
            updateProxyEnv(corporateProxy);
            expect(process.env.npm_config_proxy).toEqual(corporateProxy);
            expect(process.env.npm_config_https_proxy).toEqual(corporateProxy);
        });
        test('set value from env if there is no input', () => {
            const envProxy = process.env.FIORI_TOOLS_PROXY;
            process.env.FIORI_TOOLS_PROXY = corporateProxy;
            updateProxyEnv(undefined);
            expect(process.env.npm_config_proxy).toEqual(corporateProxy);
            expect(process.env.npm_config_https_proxy).toEqual(corporateProxy);
            process.env.FIORI_TOOLS_PROXY = envProxy;
        });
    });

    test('hideProxyCredentials: return undefined if no corporate proxy', () => {
        expect(hideProxyCredentials(undefined)).toBeUndefined();
    });

    test('hideProxyCredentials: return corporate proxy if no credentials', () => {
        expect(hideProxyCredentials('https://proxy.example')).toEqual('https://proxy.example');
    });

    test('hideProxyCredentials: hides credentials from corporate proxy', () => {
        expect(hideProxyCredentials('https://user:pass@proxy.example')).toEqual('https://***:***@proxy.example');
    });

    test('getHTMLFile: returns html', () => {
        const result = getHtmlFile('test.html');
        expect(result).toEqual('test.html');
    });

    test('getHTMLFile: ? in the URL', () => {
        const result = getHtmlFile('/test/flpSandbox.html?sap-client=100');
        expect(result).toEqual('/test/flpSandbox.html');
    });

    test('getHTMLFile: # URL', () => {
        const result = getHtmlFile('/test/flpSandboxMockServer.html#preview-app');
        expect(result).toEqual('/test/flpSandboxMockServer.html');
    });

    test('getHTMLFile: ? and # in URL', () => {
        const result = getHtmlFile('/index.html?sap-client=123#preview-app');
        expect(result).toEqual('/index.html');
    });

    test('getYamlFile: returns ui5.yaml if no args', () => {
        const result = getYamlFile([]);
        expect(result).toEqual('ui5.yaml');
    });

    test('getYamlFile: return yaml file from --config arg', () => {
        const result = getYamlFile(['--config', 'test.yaml']);
        expect(result).toEqual('test.yaml');
    });

    test('getYamlFile: return yaml file from -c arg', () => {
        const result = getYamlFile(['-c', 'test.yaml']);
        expect(result).toEqual('test.yaml');
    });

    describe('getWebAppFolderFromYaml', () => {
        const baseYamlConfig = {
            specVersion: '1.0',
            metadata: { name: 'testapp' },
            type: 'application'
        };

        test('return webapp as default if no yaml is found', async () => {
            existsMock.mockReturnValueOnce(false);
            const result = await getWebAppFolderFromYaml('no-ui5.yaml');
            expect(result).toBe('webapp');
        });

        test('return webapp as default if yaml file has no resources section', async () => {
            readFileMock.mockReturnValueOnce(YAML.stringify(baseYamlConfig));
            const result = await getWebAppFolderFromYaml('ui5.yaml');
            expect(result).toBe('webapp');
        });

        test('return webapp as default if yaml file with empty resources section', async () => {
            readFileMock.mockReturnValueOnce(
                YAML.stringify({
                    ...baseYamlConfig,
                    resources: {}
                })
            );
            const result = await getWebAppFolderFromYaml('ui5.yaml');
            expect(result).toBe('webapp');
        });

        test('return webapp as default if yaml file with empty configuration section', async () => {
            readFileMock.mockReturnValueOnce(
                YAML.stringify({
                    ...baseYamlConfig,
                    resources: { configuration: {} }
                })
            );
            const result = await getWebAppFolderFromYaml('ui5.yaml');
            expect(result).toBe('webapp');
        });

        test('return webapp as default if yaml file with empty paths', async () => {
            readFileMock.mockReturnValueOnce(
                YAML.stringify({
                    ...baseYamlConfig,
                    resources: { configuration: { paths: {} } }
                })
            );
            const result = await getWebAppFolderFromYaml('ui5.yaml');
            expect(result).toBe('webapp');
        });

        test('return path from the yaml file', async () => {
            readFileMock.mockReturnValueOnce(
                YAML.stringify({
                    ...baseYamlConfig,
                    resources: { configuration: { paths: { webapp: 'dist' } } }
                })
            );
            const result = await getWebAppFolderFromYaml('ui5.yaml');
            expect(result).toBe('dist');
        });
    });

    test('setHtmlResponse: use livereload write if present', () => {
        const mockWrite = jest.fn();
        const mockEnd = jest.fn();
        const res = {
            write: mockWrite,
            end: mockEnd,
            _livereload: true
        } as unknown as any;
        const html = '<html></html>';
        setHtmlResponse(res, html);
        expect(mockWrite).toHaveBeenCalledTimes(1);
        expect(mockWrite).toHaveBeenCalledWith(html);
        expect(mockEnd).toHaveBeenCalledTimes(1);
    });

    test('setHtmlResponse: use res.send()', () => {
        const mockSend = jest.fn();
        const mockContentType = jest.fn().mockImplementation(() => {
            return {
                send: mockSend
            };
        });
        const mockStatus = jest.fn().mockImplementation(() => {
            return {
                contentType: mockContentType
            };
        });
        const res = {
            status: mockStatus
        } as unknown as any;
        const html = '<html></html>';
        setHtmlResponse(res, html);
        expect(mockStatus).toBeCalledTimes(1);
        expect(mockStatus).toBeCalledWith(200);
        expect(mockContentType).toBeCalledTimes(1);
        expect(mockContentType).toBeCalledWith('html');
        expect(mockSend).toHaveBeenCalledWith(html);
    });

    test('getManifest: returns manifest.json', async () => {
        const manifest = {
            _version: '1.32.0'
        };
        readFileMock.mockImplementation((path) =>
            (path as string).endsWith('manifest.json') ? JSON.stringify(manifest) : ''
        );
        const result = await getManifest([]);
        expect(result).toEqual(manifest);
    });

    test('getUI5VersionFromManifest: return undefined if sap.ui5 section is missing in manifest.json', async () => {
        const manifest = {
            _version: '1.32.0'
        };
        readFileMock.mockImplementation((path) =>
            (path as string).endsWith('manifest.json') ? JSON.stringify(manifest) : ''
        );
        const result = await baseUtils.getUI5VersionFromManifest([]);
        expect(result).toBeUndefined();
    });

    test('getUI5VersionFromManifest: return undefined if sap.ui5.dependencies section is missing in manifest.json', async () => {
        const manifest = {
            _version: '1.32.0',
            'sap.ui5': {}
        };
        readFileMock.mockImplementation((path) =>
            (path as string).endsWith('manifest.json') ? JSON.stringify(manifest) : ''
        );
        const result = await baseUtils.getUI5VersionFromManifest([]);
        expect(result).toBeUndefined();
    });

    test('getUI5VersionFromManifest: return undefined if sap.ui5.dependencies.minUI5Version is missing in manifest.json', async () => {
        const manifest = {
            _version: '1.32.0',
            'sap.ui5': { dependencies: {} }
        };
        readFileMock.mockImplementation((path) =>
            (path as string).endsWith('manifest.json') ? JSON.stringify(manifest) : ''
        );
        const result = await baseUtils.getUI5VersionFromManifest([]);
        expect(result).toBeUndefined();
    });

    test('getUI5VersionFromManifest: return minUI5Version from manifest.json', async () => {
        const manifest = {
            _version: '1.32.0',
            'sap.ui5': { dependencies: { minUI5Version: '1.86.4' } }
        };
        readFileMock.mockImplementation((path) =>
            (path as string).endsWith('manifest.json') ? JSON.stringify(manifest) : ''
        );
        const result = await baseUtils.getUI5VersionFromManifest([]);
        expect(result).toBe('1.86.4');
    });

    test('setUI5Version: take version from YAML', async () => {
        const version = '1.90.0';
        const log: any = {
            info: jest.fn()
        };
        const result = await baseUtils.resolveUI5Version(version, log);
        expect(result).toEqual(version);
        expect(log.info).toBeCalledTimes(1);
        expect(log.info).toHaveBeenCalledWith('Using UI5 version 1.90.0 based on ui5.yaml');
    });

    test('setUI5Version: take version from CLI', async () => {
        const version = '';
        process.env.FIORI_TOOLS_UI5_VERSION = '';
        const log: any = {
            info: jest.fn()
        };
        const result = await baseUtils.resolveUI5Version(version, log);
        delete process.env.FIORI_TOOLS_UI5_VERSION;
        expect(result).toEqual(version);
        expect(log.info).toBeCalledTimes(1);
        expect(log.info).toHaveBeenCalledWith('Using UI5 version latest based on CLI arguments / Run configuration');
    });

    test('setUI5Version: take version from manifest.json', async () => {
        const log: any = {
            info: jest.fn()
        };
        const manifest = {
            _version: '1.32.0',
            'sap.ui5': { dependencies: { minUI5Version: '1.96.0' } }
        };
        readFileMock.mockImplementation((path) =>
            (path as string).endsWith('manifest.json') ? JSON.stringify(manifest) : ''
        );
        const result = await baseUtils.resolveUI5Version(undefined, log);
        expect(result).toEqual('1.96.0');
        expect(log.info).toBeCalledTimes(1);
        expect(log.info).toHaveBeenCalledWith('Using UI5 version 1.96.0 based on manifest.json');
    });

    test('setUI5Version: take version from manifest.json, version is variable', async () => {
        const log: any = {
            info: jest.fn()
        };
        const manifest = {
            _version: '1.32.0',
            'sap.ui5': { dependencies: { minUI5Version: '${ui5Version}' } }
        };
        readFileMock.mockImplementation((path) =>
            (path as string).endsWith('manifest.json') ? JSON.stringify(manifest) : ''
        );
        const result = await baseUtils.resolveUI5Version(undefined, log);
        expect(result).toEqual('');
        expect(log.info).toBeCalledTimes(1);
        expect(log.info).toHaveBeenCalledWith('Using UI5 version latest based on manifest.json');
    });

    describe('injectUI5Url', () => {
        test('return undefined if html file does not exists', () => {
            existsMock.mockReturnValueOnce(false);
            const result = injectUI5Url('example.html', []);
            expect(result).toBeUndefined();
        });

        test('return unmodified html, if no ui5 config', () => {
            const html = '<html></html>';
            readFileMock.mockReturnValueOnce(html);
            const result = injectUI5Url('example.html', []);
            expect(result).toEqual(html);
        });

        test('injects UI5 URL in html', () => {
            const ui5Configs: ProxyConfig[] = [
                {
                    path: '/resources',
                    url: 'https://ui5.sap.com',
                    version: '1.86.4'
                },
                {
                    path: '/test-resources',
                    url: 'https://ui5.example',
                    version: '1.23.4'
                }
            ];
            const html = `
            <html>
            <head>
                <script src="/test-resources/sap/ushell/bootstrap/sandbox.js" id="sap-ushell-bootstrap"></script>
                <script id="sap-ui-bootstrap"
                src="/resources/sap-ui-core.js"
                data-sap-ui-libs="sap.m, sap.ushell, sap.ui.core, sap.f, sap.ui.comp, sap.ui.table, sap.suite.ui.generic.template, sap.ui.generic.app"
                data-sap-ui-async="true"
                data-sap-ui-preload="async"
                data-sap-ui-theme="sap_fiori_3"
                data-sap-ui-compatVersion="edge"
                data-sap-ui-language="en"
                data-sap-ui-resourceroots='{"project": "../"}'
                data-sap-ui-frameOptions="allow"> // NON-SECURE setting for testing environment
                </script>
            </head>
            </html>`;

            readFileMock.mockReturnValueOnce(html);
            const result = injectUI5Url('example.html', ui5Configs);
            expect(result).toMatchSnapshot();
        });

        test('injects UI5 URL in html, latest ui5 version', async () => {
            const ui5Configs: ProxyConfig[] = [
                {
                    path: '/resources',
                    url: 'https://ui5.sap.com',
                    version: ''
                },
                {
                    path: '/test-resources',
                    url: 'https://ui5.example'
                }
            ];
            const html = `
            <html>
            <head>
                <script src="/test-resources/sap/ushell/bootstrap/sandbox.js" id="sap-ushell-bootstrap"></script>
                <script id="sap-ui-bootstrap"
                src="/resources/sap-ui-core.js"
                data-sap-ui-libs="sap.m, sap.ushell, sap.ui.core, sap.f, sap.ui.comp, sap.ui.table, sap.suite.ui.generic.template, sap.ui.generic.app"
                data-sap-ui-async="true"
                data-sap-ui-preload="async"
                data-sap-ui-theme="sap_fiori_3"
                data-sap-ui-compatVersion="edge"
                data-sap-ui-language="en"
                data-sap-ui-resourceroots='{"project": "../"}'
                data-sap-ui-frameOptions="allow"> // NON-SECURE setting for testing environment
                </script>
            </head>
            </html>`;
            readFileMock.mockReturnValueOnce(html);
            const result = injectUI5Url('example.html', ui5Configs);
            expect(result).toMatchSnapshot();
        });
    });

    describe('injectScripts', () => {
        const nextMock = jest.fn();
        const respMock: Response = {} as Partial<Response> as Response;
        respMock.status = jest.fn().mockReturnValue(respMock);
        respMock.contentType = jest.fn().mockReturnValue(respMock);
        respMock.send = jest.fn().mockReturnValue(respMock);

        beforeEach(() => {
            nextMock.mockReset();
        });

        test('HTML is modified and response is sent', async () => {
            readFileMock.mockReturnValue('<html></html>');
            await baseUtils.injectScripts({ baseUrl: 'index.html' } as any, respMock, nextMock, []);
            expect(respMock.status).toHaveBeenCalledWith(200);
            expect(respMock.contentType).toHaveBeenCalledWith('html');
            expect(respMock.send).toHaveBeenCalled();
            expect(nextMock).not.toHaveBeenCalled();
        });

        test('calls next() if no html file to modify', async () => {
            readFileMock.mockReturnValue('');
            await baseUtils.injectScripts({ baseUrl: 'index.html' } as any, respMock, nextMock, []);
            expect(nextMock).toHaveBeenCalled();
        });

        test('calls next(error) in case of exception', async () => {
            await baseUtils.injectScripts(null as any, null as any, nextMock, []);
            expect(nextMock).toBeCalledWith(expect.any(Error));
        });
    });

    test('filterCompressedHtmlFiles: returns true if accept header is not set', () => {
        const req = {
            headers: {}
        };
        const result = filterCompressedHtmlFiles('my/req/path', req as any);
        expect(result).toBeTruthy();
    });

    test('filterCompressedHtmlFiles: deletes accept-encoding header if accept header is text/html', () => {
        const req = {
            headers: {} as any
        };
        req.headers['accept'] = 'text/html';
        req.headers['accept-encoding'] = 'gzip';
        const result = filterCompressedHtmlFiles('my/req/path', req as any);
        expect(result).toBeTruthy();
        expect(req.headers['accept-encoding']).toBeUndefined();
    });

    test('filterCompressedHtmlFiles: deletes accept-encoding header if accept header is application/xhtml+xml', () => {
        const req = {
            headers: {} as any
        };
        req.headers['accept'] = 'application/xhtml+xml';
        req.headers['accept-encoding'] = 'gzip';
        const result = filterCompressedHtmlFiles('my/req/path', req as any);
        expect(result).toBeTruthy();
        expect(req.headers['accept-encoding']).toBeUndefined();
    });
});
