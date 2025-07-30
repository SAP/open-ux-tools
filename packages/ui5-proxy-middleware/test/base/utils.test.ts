import {
    filterCompressedHtmlFiles,
    getCorporateProxyServer,
    getHtmlFile,
    getYamlFile,
    hideProxyCredentials,
    injectUI5Url,
    proxyRequestHandler,
    proxyResponseHandler,
    sendResponse,
    proxyErrorHandler,
    updateProxyEnv
} from '../../src/base/utils';
import type { Response } from 'express';
import fs from 'fs';
import * as baseUtils from '../../src/base/utils';
import type { ProxyConfig } from '../../src/base/types';
import type { IncomingMessage } from 'http';
import { NullTransport, ToolsLogger } from '@sap-ux/logger';
import type { Manifest } from '@sap-ux/project-access';
import type { ReaderCollection } from '@ui5/fs';

describe('utils', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('proxyHandlers', () => {
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
                debug: jest.fn()
            };
            proxyRequestHandler(proxyReq as any, res as any, etag);
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
            expect(debugSpy).toHaveBeenCalled();

            // forward or throw other errors
            const otherError = new Error();
            proxyErrorHandler(otherError, requestWithNext, logger);
            expect(mockNext).toHaveBeenCalledTimes(1);
            try {
                proxyErrorHandler(otherError, request, logger);
            } catch (error) {
                expect(error).toBe(otherError);
            }

            // ignore empty errors
            debugSpy.mockReset();
            const emptyError = { message: '', stack: 'Error' } as Error;
            proxyErrorHandler(emptyError, requestCausingError, logger);
            expect(debugSpy).toHaveBeenCalledTimes(1);
            expect(debugSpy).toHaveBeenCalledWith(
                'An error: ' +
                    JSON.stringify(emptyError, null, 2) +
                    ' was thrown for the request: ' +
                    requestCausingError.originalUrl +
                    '.'
            );
        });
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

    describe('hideProxyCredentials', () => {
        test('return undefined if no corporate proxy', () => {
            expect(hideProxyCredentials(undefined)).toBeUndefined();
        });

        test('return corporate proxy if no credentials', () => {
            expect(hideProxyCredentials('https://proxy.example')).toEqual('https://proxy.example');
        });

        test('hides credentials from corporate proxy', () => {
            expect(hideProxyCredentials('https://user:pass@proxy.example')).toEqual('https://***:***@proxy.example');
        });
    });

    describe('getHTMLFile', () => {
        test('returns html', () => {
            const result = getHtmlFile('test.html');
            expect(result).toEqual('test.html');
        });

        test('? in the URL', () => {
            const result = getHtmlFile('/test/flpSandbox.html?sap-client=100');
            expect(result).toEqual('/test/flpSandbox.html');
        });

        test('# URL', () => {
            const result = getHtmlFile('/test/flpSandboxMockServer.html#preview-app');
            expect(result).toEqual('/test/flpSandboxMockServer.html');
        });

        test('? and # in URL', () => {
            const result = getHtmlFile('/index.html?sap-client=123#preview-app');
            expect(result).toEqual('/index.html');
        });
    });

    describe('getYamlFile', () => {
        test('returns ui5.yaml if no args', () => {
            const result = getYamlFile([]);
            expect(result).toEqual('ui5.yaml');
        });

        test('return yaml file from --config arg', () => {
            const result = getYamlFile(['--config', 'test.yaml']);
            expect(result).toEqual('test.yaml');
        });

        test('return yaml file from -c arg', () => {
            const result = getYamlFile(['-c', 'test.yaml']);
            expect(result).toEqual('test.yaml');
        });
    });

    describe('sendResponse', () => {
        test('use livereload write if present', () => {
            const mockWrite = jest.fn();
            const mockEnd = jest.fn();
            const res = {
                write: mockWrite,
                end: mockEnd,
                _livereload: true
            } as unknown as any;
            const html = '<html></html>';
            sendResponse(res, html);
            expect(mockWrite).toHaveBeenCalledTimes(1);
            expect(mockWrite).toHaveBeenCalledWith(html);
            expect(mockEnd).toHaveBeenCalledTimes(1);
        });

        test('use res.send()', () => {
            const res = {
                writeHead: jest.fn(),
                write: jest.fn(),
                end: jest.fn()
            } as unknown as any;
            const html = '<html></html>';
            sendResponse(res, html);
            expect(res.writeHead).toHaveBeenCalledTimes(1);
            expect(res.writeHead).toHaveBeenCalledWith(200, {
                'Content-Type': 'text/html'
            });
            expect(res.write).toHaveBeenCalledWith(html);
            expect(res.end).toHaveBeenCalledTimes(1);
        });
    });

    describe('setUI5Version', () => {
        const readFileMock = jest.spyOn(fs, 'readFileSync');

        test('take version from YAML', async () => {
            const version = '1.90.0';
            const log: any = {
                info: jest.fn()
            };
            const result = await baseUtils.resolveUI5Version(version, log);
            expect(result).toEqual(version);
            expect(log.info).toHaveBeenCalledTimes(1);
            expect(log.info).toHaveBeenCalledWith('Using UI5 version: 1.90.0 based on: ui5.yaml.');
        });

        test('take version from CLI', async () => {
            const version = '';
            process.env.FIORI_TOOLS_UI5_VERSION = '';
            const log: any = {
                info: jest.fn()
            };
            const result = await baseUtils.resolveUI5Version(version, log);
            delete process.env.FIORI_TOOLS_UI5_VERSION;
            expect(result).toEqual(version);
            expect(log.info).toHaveBeenCalledTimes(1);
            expect(log.info).toHaveBeenCalledWith(
                'Using UI5 version: latest based on: CLI arguments / Run configuration.'
            );
        });

        test('take version from manifest.json', async () => {
            const log: any = {
                info: jest.fn()
            };
            const manifest = {
                _version: '1.32.0',
                'sap.ui5': { dependencies: { minUI5Version: '1.96.0' } }
            } as Manifest;
            const result = await baseUtils.resolveUI5Version(undefined, log, manifest);
            expect(result).toEqual('1.96.0');
            expect(log.info).toHaveBeenCalledTimes(1);
            expect(log.info).toHaveBeenCalledWith('Using UI5 version: 1.96.0 based on: manifest.json.');
        });

        test('take version from manifest.json, version is variable', async () => {
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
            expect(log.info).toHaveBeenCalledTimes(1);
            expect(log.info).toHaveBeenCalledWith('Using UI5 version: latest based on: manifest.json.');
        });
    });

    describe('injectUI5Url', () => {
        test('return unmodified html, if no ui5 config', () => {
            const html = '<html></html>';
            const result = injectUI5Url(html, []);
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
            const result = injectUI5Url(html, ui5Configs);
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
            const result = injectUI5Url(html, ui5Configs);
            expect(result).toMatchSnapshot();
        });
    });

    describe('injectScripts', () => {
        const byGlobMock = jest.fn();
        const rootProject = {
            byGlob: byGlobMock
        } as unknown as ReaderCollection;

        const nextMock = jest.fn();
        const respMock: Response = {} as Partial<Response> as Response;
        respMock.writeHead = jest.fn();
        respMock.write = jest.fn();
        respMock.end = jest.fn();

        const htmlSandbox1 =
            '<html><script src="../test-resources/sap/ushell/bootstrap/sandbox.js" id="sap-ushell-bootstrap"></script></html>';
        const htmlSandbox2 =
            '<html><script src="../resources/sap/ushell/bootstrap/sandbox2.js" id="sap-ushell-bootstrap"></script></html>';

        beforeEach(() => {
            nextMock.mockReset();
        });

        test('HTML is modified and response is sent (UI5 1.x)', async () => {
            byGlobMock.mockResolvedValueOnce([
                {
                    getString: () => htmlSandbox1
                }
            ]);

            await baseUtils.injectScripts(
                { url: 'test/flp.html' } as any,
                respMock,
                nextMock,
                [{ path: '/test-resources', url: 'http://ui5.sap.com', version: '1.124.0' }],
                rootProject
            );
            expect(respMock.writeHead).toHaveBeenCalledTimes(1);
            expect(respMock.writeHead).toHaveBeenCalledWith(200, {
                'Content-Type': 'text/html'
            });
            expect(respMock.write).toHaveBeenCalledWith(
                '<html><script src="http://ui5.sap.com/1.124.0/test-resources/sap/ushell/bootstrap/sandbox.js" id="sap-ushell-bootstrap"></script></html>'
            );
            expect(respMock.end).toHaveBeenCalled();
            expect(nextMock).not.toHaveBeenCalled();

            expect(byGlobMock).toHaveBeenCalledWith('**/test/flp.html');
        });

        test('HTML is modified and response is sent (UI5 2.x backwards compatible)', async () => {
            byGlobMock.mockResolvedValueOnce([
                {
                    getString: () => htmlSandbox2
                }
            ]);

            await baseUtils.injectScripts(
                { url: 'test/flp.html' } as any,
                respMock,
                nextMock,
                [{ path: '/test-resources', url: 'http://ui5.sap.com', version: '1.124.0' }],
                rootProject
            );
            expect(respMock.writeHead).toHaveBeenCalledTimes(1);
            expect(respMock.writeHead).toHaveBeenCalledWith(200, {
                'Content-Type': 'text/html'
            });
            expect(respMock.write).toHaveBeenCalledWith(
                '<html><script src="http://ui5.sap.com/1.124.0/resources/sap/ushell/bootstrap/sandbox2.js" id="sap-ushell-bootstrap"></script></html>'
            );
            expect(respMock.end).toHaveBeenCalled();
            expect(nextMock).not.toHaveBeenCalled();

            expect(byGlobMock).toHaveBeenCalledWith('**/test/flp.html');
        });

        test('HTML is modified and response is sent (UI5 2.x)', async () => {
            byGlobMock.mockResolvedValueOnce([
                {
                    getString: () => htmlSandbox2
                }
            ]);

            await baseUtils.injectScripts(
                { url: 'test/flp.html' } as any,
                respMock,
                nextMock,
                [{ path: '/resources', url: 'http://ui5.sap.com', version: '1.124.0' }],
                rootProject
            );
            expect(respMock.writeHead).toHaveBeenCalledTimes(1);
            expect(respMock.writeHead).toHaveBeenCalledWith(200, {
                'Content-Type': 'text/html'
            });
            expect(respMock.write).toHaveBeenCalledWith(
                '<html><script src="http://ui5.sap.com/1.124.0/resources/sap/ushell/bootstrap/sandbox2.js" id="sap-ushell-bootstrap"></script></html>'
            );
            expect(respMock.end).toHaveBeenCalled();
            expect(nextMock).not.toHaveBeenCalled();

            expect(byGlobMock).toHaveBeenCalledWith('**/test/flp.html');
        });

        test('calls next() if no html file to modify', async () => {
            byGlobMock.mockResolvedValueOnce([]);
            await baseUtils.injectScripts({ url: 'index.html' } as any, respMock, nextMock, [], rootProject);
            expect(byGlobMock).toHaveBeenCalledWith('**/index.html');
            expect(nextMock).toHaveBeenCalled();
        });

        test('calls next(error) in case of exception', async () => {
            await baseUtils.injectScripts(null as any, null as any, nextMock, [], rootProject);
            expect(nextMock).toHaveBeenCalledWith(expect.any(Error));
        });
    });

    describe('filterCompressedHtmlFiles', () => {
        test('returns true if accept header is not set', () => {
            const req = {
                headers: {}
            };
            const result = filterCompressedHtmlFiles('my/req/path', req as any);
            expect(result).toBeTruthy();
        });

        test('deletes accept-encoding header if accept header is text/html', () => {
            const req = {
                headers: {} as any
            };
            req.headers['accept'] = 'text/html';
            req.headers['accept-encoding'] = 'gzip';
            const result = filterCompressedHtmlFiles('my/req/path', req as any);
            expect(result).toBeTruthy();
            expect(req.headers['accept-encoding']).toBeUndefined();
        });

        test('deletes accept-encoding header if accept header is application/xhtml+xml', () => {
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
});
