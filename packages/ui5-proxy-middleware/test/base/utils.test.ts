import {
    filterCompressedHtmlFiles,
    getCorporateProxyServer,
    getHtmlFile,
    getManifest,
    getWebAppFolderFromYaml,
    getYamlFile,
    hideProxyCredentials,
    injectUI5Url,
    isHostExcludedFromProxy,
    proxyRequestHandler,
    proxyResponseHandler,
    setHtmlResponse
} from '../../src/base/utils';
import YAML from 'yaml';
import fs, { promises } from 'fs';
import * as baseUtils from '../../src/base/utils';
import { UI5Config } from '../../src/base/types';

describe('Utils', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.restoreAllMocks();
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

    test('getCorporateProxyServer: gets proxy configuration of user', () => {
        const corporateProxy = 'https://myproxy:8443';
        expect(getCorporateProxyServer(corporateProxy)).toEqual(corporateProxy);

        const envProxy = process.env.npm_config_https_proxy;
        process.env.npm_config_https_proxy = corporateProxy;
        expect(getCorporateProxyServer(undefined)).toEqual(corporateProxy);
        process.env.npm_config_https_proxy = envProxy;
    });

    test('isHostExcludedFromProxy: no_proxy config does not exist', () => {
        const host = 'http://www.example.example';
        expect(isHostExcludedFromProxy(undefined, host)).toBeFalsy();
    });

    test('isHostExcludedFromProxy: host is excluded via no_proxy config', () => {
        const noProxyConfig = 'example.example';
        const host = 'http://www.example.example';
        expect(isHostExcludedFromProxy(noProxyConfig, host)).toBeTruthy();
    });

    test('isHostExcludedFromProxy. host is excluded via no_proxy config, bit with leading .', () => {
        const noProxyConfig = '.example.example';
        const host = 'http://www.example.example';
        expect(isHostExcludedFromProxy(noProxyConfig, host)).toBeTruthy();
    });

    test('isHostExcludedFromProxy: all hosts are excluded from proxy', () => {
        const noProxyConfig = '*';
        const host = 'http://www.example.example';
        expect(isHostExcludedFromProxy(noProxyConfig, host)).toBeTruthy();
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

    test('getWebAppFolderFromYaml: returns webapp as default', async () => {
        const result = await getWebAppFolderFromYaml('');
        expect(result).toEqual('webapp');
    });

    test('getWebAppFolderFromYaml: returns webapp as default', async () => {
        const yamlMock = {
            specVersion: '1.0',
            metadata: { name: 'testapp' },
            type: 'application'
        };
        const readFile = promises.readFile;
        const readFileMock = (promises.readFile = jest.fn());
        readFileMock.mockResolvedValue(YAML.stringify(yamlMock));
        const result = await getWebAppFolderFromYaml('ui5.yaml');
        expect(result).toEqual('webapp');
        promises.readFile = readFile;
    });

    test('getWebAppFolderFromYaml: yaml file with empty resources section', async () => {
        const yamlMock = {
            specVersion: '1.0',
            metadata: { name: 'testapp' },
            type: 'application',
            resources: {}
        };
        const readFile = promises.readFile;
        const readFileMock = (promises.readFile = jest.fn());
        readFileMock.mockResolvedValue(YAML.stringify(yamlMock));
        const result = await getWebAppFolderFromYaml('ui5.yaml');
        expect(result).toEqual('webapp');
        promises.readFile = readFile;
    });

    test('getWebAppFolderFromYaml: yaml file with empty configuration section', async () => {
        const yamlMock = {
            specVersion: '1.0',
            metadata: { name: 'testapp' },
            type: 'application',
            resources: { configuration: {} }
        };
        const readFile = promises.readFile;
        const readFileMock = (promises.readFile = jest.fn());
        readFileMock.mockResolvedValue(YAML.stringify(yamlMock));
        const result = await getWebAppFolderFromYaml('ui5.yaml');
        expect(result).toEqual('webapp');
        promises.readFile = readFile;
    });

    test('getWebAppFolderFromYaml: yaml file with empty paths', async () => {
        const yamlMock = {
            specVersion: '1.0',
            metadata: { name: 'testapp' },
            type: 'application',
            resources: { configuration: { paths: {} } }
        };
        const readFile = promises.readFile;
        const readFileMock = (promises.readFile = jest.fn());
        readFileMock.mockResolvedValue(YAML.stringify(yamlMock));
        const result = await getWebAppFolderFromYaml('ui5.yaml');
        expect(result).toEqual('webapp');
        promises.readFile = readFile;
    });

    test('getWebAppFolderFromYaml: yaml file with webapp path', async () => {
        const yamlMock = {
            specVersion: '1.0',
            metadata: { name: 'testapp' },
            type: 'application',
            resources: { configuration: { paths: { webapp: 'dist' } } }
        };
        const readFile = promises.readFile;
        const readFileMock = (promises.readFile = jest.fn());
        readFileMock.mockResolvedValue(YAML.stringify(yamlMock));
        const result = await getWebAppFolderFromYaml('ui5.yaml');
        expect(result).toEqual('dist');
        promises.readFile = readFile;
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
        const yamlMock = {
            specVersion: '1.0',
            metadata: { name: 'testapp' },
            type: 'application'
        };
        const readFile = promises.readFile;
        const readFileMock = (promises.readFile = jest.fn());
        readFileMock.mockImplementation((path: string) => {
            if (path.indexOf('ui5.yaml') !== -1) {
                return Promise.resolve(YAML.stringify(yamlMock));
            }

            if (path.indexOf('manifest.json') !== -1) {
                return Promise.resolve(JSON.stringify(manifest));
            }
        });
        const result = await getManifest([]);
        expect(result).toEqual(manifest);
        promises.readFile = readFile;
    });

    test('getUI5VersionFromManifest: return undefined if sap.ui5 section is missing in manifest.json', async () => {
        const manifest = {
            _version: '1.32.0'
        };
        //@ts-ignore
        jest.spyOn(baseUtils, 'getManifest').mockImplementation(() => {
            return Promise.resolve(manifest);
        });
        const result = await baseUtils.getUI5VersionFromManifest([]);
        expect(result).toBeUndefined();
    });

    test('getUI5VersionFromManifest: return undefined if sap.ui5.dependencies section is missing in manifest.json', async () => {
        const manifest = {
            _version: '1.32.0',
            'sap.ui5': {}
        };
        //@ts-ignore
        jest.spyOn(baseUtils, 'getManifest').mockImplementation(async () => {
            return Promise.resolve(manifest);
        });
        const result = await baseUtils.getUI5VersionFromManifest([]);
        expect(result).toBeUndefined();
    });

    test('getUI5VersionFromManifest: return undefined if sap.ui5.dependencies.minUI5Version is missing in manifest.json', async () => {
        const manifest = {
            _version: '1.32.0',
            'sap.ui5': { dependencies: {} }
        };
        //@ts-ignore
        jest.spyOn(baseUtils, 'getManifest').mockImplementation(async () => {
            return Promise.resolve(manifest);
        });
        const result = await baseUtils.getUI5VersionFromManifest([]);
        expect(result).toBeUndefined();
    });

    test('getUI5VersionFromManifest: return minUI5Version from manifest.json', async () => {
        const manifest = {
            _version: '1.32.0',
            'sap.ui5': { dependencies: { minUI5Version: '1.86.4' } }
        };
        //@ts-ignore
        jest.spyOn(baseUtils, 'getManifest').mockImplementation(async () => {
            return Promise.resolve(manifest);
        });
        const result = await baseUtils.getUI5VersionFromManifest([]);
        expect(result).toEqual('1.86.4');
    });

    test('setUI5Version: take version from YAML', async () => {
        const version = '1.90.0';
        const log: any = {
            info: jest.fn()
        };
        const result = await baseUtils.setUI5Version(version, log);
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
        const result = await baseUtils.setUI5Version(version, log);
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
        //@ts-ignore
        jest.spyOn(baseUtils, 'getManifest').mockImplementation(async () => {
            return Promise.resolve(manifest);
        });
        const result = await baseUtils.setUI5Version(undefined, log);
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
        //@ts-ignore
        jest.spyOn(baseUtils, 'getManifest').mockImplementation(async () => {
            return Promise.resolve(manifest);
        });
        const result = await baseUtils.setUI5Version(undefined, log);
        expect(result).toEqual('');
        expect(log.info).toBeCalledTimes(1);
        expect(log.info).toHaveBeenCalledWith('Using UI5 version latest based on manifest.json');
    });

    test('injectUI5Url: return undefined if html file does not exists', async () => {
        const result = await injectUI5Url('example.html', []);
        expect(result).toBeUndefined();
    });

    test('injectUI5Url: return unmodified html, if no ui5 config', async () => {
        jest.spyOn(fs, 'existsSync').mockImplementationOnce(() => {
            return true;
        });
        const html = '<html></html>';
        const readFile = promises.readFile;
        const readFileMock = (promises.readFile = jest.fn());
        readFileMock.mockResolvedValue(html);
        const result = await injectUI5Url('example.html', []);
        expect(result).toEqual(html);
        promises.readFile = readFile;
    });

    test('injectUI5Url: injects UI5 URL in html', async () => {
        jest.spyOn(fs, 'existsSync').mockImplementationOnce(() => {
            return true;
        });
        const ui5Configs: UI5Config[] = [
            {
                path: '/resources',
                url: 'https://ui5.sap.com',
                version: '1.86.4'
            },
            {
                path: '/test-resources',
                url: 'https://ui5.sap.com',
                version: '1.86.4'
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
        const readFile = promises.readFile;
        const readFileMock = (promises.readFile = jest.fn());
        readFileMock.mockResolvedValue(html);
        const result = await injectUI5Url('example.html', ui5Configs);
        expect(result).toMatchSnapshot();
        promises.readFile = readFile;
    });

    test('injectUI5Url: injects UI5 URL in html, latest ui5 version', async () => {
        jest.spyOn(fs, 'existsSync').mockImplementationOnce(() => {
            return true;
        });
        const ui5Configs: UI5Config[] = [
            {
                path: '/resources',
                url: 'https://ui5.sap.com',
                version: ''
            },
            {
                path: '/test-resources',
                url: 'https://ui5.sap.com',
                version: ''
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
        const readFile = promises.readFile;
        const readFileMock = (promises.readFile = jest.fn());
        readFileMock.mockResolvedValue(html);
        const result = await injectUI5Url('example.html', ui5Configs);
        expect(result).toMatchSnapshot();
        promises.readFile = readFile;
    });

    test('injectScripts: injectUI5Url is called and HTML is modified', async () => {
        const getHtmlFileMock = jest.spyOn(baseUtils, 'getHtmlFile').mockImplementation(() => {
            return 'index.html';
        });
        const getYamlFileMock = jest.spyOn(baseUtils, 'getYamlFile').mockImplementation(() => {
            return 'ui5.yaml';
        });
        const getWebAppFolderFromYamlMock = jest
            .spyOn(baseUtils, 'getWebAppFolderFromYaml')
            .mockImplementation(async () => {
                return Promise.resolve('webapp');
            });
        const injectUI5UrlMock = jest.spyOn(baseUtils, 'injectUI5Url').mockImplementation(async () => {
            return Promise.resolve('<html></html>');
        });
        const setHtmlResponseMock = jest.spyOn(baseUtils, 'setHtmlResponse').mockImplementation(jest.fn());
        await baseUtils.injectScripts({} as any, {} as any, {} as any, []);
        expect(getHtmlFileMock).toHaveBeenCalled();
        expect(getYamlFileMock).toHaveBeenCalled();
        expect(getWebAppFolderFromYamlMock).toHaveBeenCalled();
        expect(setHtmlResponseMock).toHaveBeenCalled();
        expect(injectUI5UrlMock).toHaveBeenCalled();
    });

    test('injectScripts: calls next() if no html file to modify', async () => {
        const getHtmlFileMock = jest.spyOn(baseUtils, 'getHtmlFile').mockImplementation(() => {
            return 'index.html';
        });
        const getYamlFileMock = jest.spyOn(baseUtils, 'getYamlFile').mockImplementation(() => {
            return 'ui5.yaml';
        });
        const getWebAppFolderFromYamlMock = jest
            .spyOn(baseUtils, 'getWebAppFolderFromYaml')
            .mockImplementation(async () => {
                return Promise.resolve('webapp');
            });
        const injectUI5UrlMock = jest.spyOn(baseUtils, 'injectUI5Url').mockImplementation(async () => {
            return Promise.resolve(undefined);
        });
        const setHtmlResponseMock = jest.spyOn(baseUtils, 'setHtmlResponse').mockImplementation(jest.fn());
        const nextMock = jest.fn();
        await baseUtils.injectScripts({} as any, {} as any, nextMock, []);
        expect(getHtmlFileMock).toHaveBeenCalled();
        expect(getYamlFileMock).toHaveBeenCalled();
        expect(getWebAppFolderFromYamlMock).toHaveBeenCalled();
        expect(setHtmlResponseMock).not.toHaveBeenCalled();
        expect(injectUI5UrlMock).toHaveBeenCalled();
        expect(nextMock).toHaveBeenCalled();
    });

    test('injectScripts: calls next(error) in case of exception', async () => {
        const nextMock = jest.fn();
        await baseUtils.injectScripts({} as any, {} as any, nextMock, []);
        expect(nextMock).toHaveBeenCalled();
        expect(nextMock).toBeCalledWith(expect.any(Error));
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
