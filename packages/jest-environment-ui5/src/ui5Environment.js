const fs = require('fs');
const path = require('path');

let mockData = {};

/**
 *
 * @param globalWindow
 * @param pathMappingFn
 * @param isV2
 */
function initUI5Environment(globalWindow, pathMappingFn, isV2) {
    mockData = {};

    globalWindow.jestSetup = true;

    const xhrMockClass = () => {
        return {
            withCredentials: () => {},
            listeners: {},
            open: function (type, url) {
                if (url.startsWith('./')) {
                    this.url = url;
                } else if (url.endsWith('.js')) {
                    this.url = url.substring(0, url.length - 3);
                } else {
                    this.url = url;
                }
            },
            send: function () {
                let fileContent = mockData[this.url];
                if (fileContent) {
                    this.responseText = fileContent;
                } else {
                    let filePath;
                    try {
                        filePath = globalWindow.requireFn.resolve(this.url);
                    } catch (e) {
                        filePath = '';
                    }
                    if (!filePath) {
                        filePath = pathMapping[this.url] || pathMappingFn(this.url);
                    }

                    if (this.url.endsWith('.json') || this.url.endsWith('.properties') || this.url.endsWith('.xml')) {
                        this.responseText = fs.readFileSync(filePath).toString('utf-8');
                    } else {
                        this.responseText = (...args) => {
                            let requireOutput;
                            try {
                                requireOutput = globalWindow.requireFn(filePath);
                            } catch (e) {
                                if (this.url.endsWith('-dbg')) {
                                    const subUrl = this.url.substring(0, this.url.length - 4);
                                    const filePath = pathMapping[subUrl] || pathMappingFn(subUrl);
                                    requireOutput = globalWindow.requireFn(filePath);
                                } else {
                                    throw e;
                                }
                            }

                            return requireOutput;
                        };
                    }
                }
                if (this.responseText && (this.responseText.startsWith?.('<?xml') || this.url.endsWith('.xml'))) {
                    this.isXML = true;
                }

                if (this.listeners['load']) {
                    this.listeners['load']?.({
                        status: 200,
                        responseText: this.responseText
                    });
                } else {
                    this['onload'].apply(this, []);
                }
            },
            getAllResponseHeaders: function () {
                if (this.isXML) {
                    return 'Content-Type: application/xml; Last-Modified: 2019-08-29T00:00:00.000Z;ETag: NotYolow';
                } else if (this.url.endsWith('json')) {
                    return {
                        'Content-Type': 'application/json'
                    };
                } else {
                    return {};
                }
            },
            getResponseHeader: function (type) {
                if (type === 'Content-Type' && this.url.endsWith('xml')) {
                    return 'application/xml';
                }
            },
            setRequestHeader: () => {},
            addEventListener: function (type, fn) {
                this.listeners[type] = fn;
            },
            readyState: 4,
            status: 200
        };
    };

    globalWindow.XMLHttpRequest = function () {
        return xhrMockClass();
    };
    globalWindow.signals = require('signals');
    globalWindow.performance.timing = {
        fetchStart: Date.now(),
        navigationStart: Date.now()
    };
    globalWindow.requestAnimationFrame = (callback) => {
        callback(performance.now());
    };
    globalWindow.ArrayBuffer = ArrayBuffer;
    globalWindow.CanvasRenderingContext2D = undefined;
    globalWindow.ResizeObserver = class ResizeObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
    };
    globalWindow.fetch = function (fetchWhat) {
        return Promise.resolve({
            text: function () {
                const fetchFileContent = fs
                    .readFileSync(globalWindow.sap.ui.loader._.getResourcePath(fetchWhat))
                    .toString('utf-8');
                return fetchFileContent;
            }
        });
    };
    globalWindow.window['sap-ui-config'] = {
        bindingSyntax: 'complex',
        'xx-waitForTheme': false,
        loglevel: process.env.BUILD_TYPE === 'production' ? 'ERROR' : 'INFO',
        libs: 'sap.ui.core, sap.m', //, sap.ui.mdc, sap.ui.fl",
        language: 'EN',
        async: true,
        calendarType: 'Gregorian',
        resourceRoots: { '': '' }
    };

    let pathMapping = {
        'sap/ui/thirdparty/jquery-mobile-custom': path.resolve(__dirname, './shim/jquery-mobile-custom.js'),
        'sap/ui/thirdparty/jquery-mobile-custom-dbg': path.resolve(__dirname, './shim/jquery-mobile-custom.js'),
        'sap/ui/thirdparty/hasher': path.resolve(__dirname, './shim/hasher.js'),
        'sap/ui/thirdparty/hasher.js': path.resolve(__dirname, './shim/hasher.js'),

        'sap-ui-version.json': path.resolve(__dirname, './shim/sap-ui-version.json'),
        ui5loader: path.resolve(__dirname, './shim/ui5loader.js'),
        'ui5loader-dbg': path.resolve(__dirname, './shim/ui5loader.js')
    };
    if (isV2) {
        pathMapping['sap/ui/thirdparty/jquery'] = path.resolve(__dirname, './shim/v2/jquery.js');
        pathMapping['sap/ui/thirdparty/jquery.js'] = path.resolve(__dirname, './shim/v2/jquery.js');
        pathMapping['sap/ui/thirdparty/jquery-mobile-custom'] = path.resolve(
            __dirname,
            './shim/v2/jquery-mobile-custom.js'
        );
        pathMapping['sap/ui/thirdparty/jquery-mobile-custom.js'] = path.resolve(
            __dirname,
            './shim/v2/jquery-mobile-custom.js'
        );
        pathMapping['sap/ui/thirdparty/jquery-compat'] = path.resolve(__dirname, './shim/v2/jquery-compat.js');
        pathMapping['sap/ui/thirdparty/jquery-compat.js'] = path.resolve(__dirname, './shim/v2/jquery-compat.js');
    }
    globalWindow.pathMapping = pathMapping;
    globalWindow.pathMappingFn = pathMappingFn;

    globalWindow.jestUI5 = {
        mock: function (moduleName, factory) {
            return globalWindow.jest.mock(pathMappingFn(moduleName), factory);
        },
        resolvePath: function (sPath) {
            return pathMapping[sPath] || pathMappingFn(sPath);
        },
        registerMockMetadata: function (sPath, dataOrPath) {
            mockData[`${sPath}$metadata`] = dataOrPath;
        },
        registerFakeFragment: function (sPath, dataOrPath) {
            mockData[`${sPath}`] = dataOrPath;
        }
    };
    globalWindow.sap = {
        jest: {
            mock: function (moduleName, factory) {
                return globalWindow.jest.mock(pathMappingFn(moduleName), factory);
            },
            resolvePath: function (sPath) {
                return pathMapping[sPath] || pathMappingFn(sPath);
            },
            registerMockMetadata: function (sPath, dataOrPath) {
                mockData[`${sPath}$metadata`] = dataOrPath;
            },
            registerFakeFragment: function (sPath, dataOrPath) {
                mockData[`${sPath}`] = dataOrPath;
            }
        },
        viz: {
            api: {
                env: {
                    Format: {
                        numericFormatter: function () {}
                    }
                }
            }
        }
    };
}

module.exports.initUI5Environment = initUI5Environment;
