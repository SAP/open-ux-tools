const fs = require('fs');
const path = require('path');

let mockData = {};

/**
 * Returns a mock class for XMLHttpRequest.
 * @param {object} globalWindow The global window object.
 * @param {object} pathMapping The path mapping for the shimmed files.
 * @param {object} pathMappingFn The path mapping function.
 * @param {object} shimmedFilePath The shimmed file paths.
 * @returns {object} The fake XMLHttpRequest class.
 */
function getXHRMockClass(globalWindow, pathMapping, pathMappingFn, shimmedFilePath) {
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
                            if (shimmedFilePath[this.url]) {
                                requireOutput = new (require('node:vm').Script)(
                                    fs.readFileSync(globalWindow.requireFn.resolve(filePath)).toString('utf-8')
                                ).runInContext(globalWindow);
                            } else {
                                requireOutput = globalWindow.requireFn(filePath);
                            }
                        } catch (e) {
                            // Fallback to the non debug version in case it was requested but doesn't exist
                            if (this.url.endsWith('-dbg')) {
                                const subUrl = this.url.substring(0, this.url.length - 4);
                                const filePath = pathMapping[subUrl] || pathMappingFn(subUrl);
                                // requireOutput = new (require('node:vm').Script)(
                                //     fs.readFileSync(filePath).toString('utf-8')
                                // ).runInContext(globalWindow);
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
            return undefined;
        },
        setRequestHeader: () => {},
        addEventListener: function (type, fn) {
            this.listeners[type] = fn;
        },
        readyState: 4,
        status: 200
    };
}

/**
 * Initializes the UI5 environment for the Jest tests.
 * @param {object} globalWindow The global window object.
 * @param {Function} pathMappingFn The path mapping function.
 * @param {boolean} isV2  Whether the environment is for UI5 V2.
 * @returns {void}
 */
function initUI5Environment(globalWindow, pathMappingFn, isV2) {
    mockData = {};

    globalWindow.jestSetup = true;

    globalWindow.XMLHttpRequest = function () {
        return getXHRMockClass(globalWindow, pathMapping, pathMappingFn, shimmedFilePath);
    };
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
        observe() {
            // We don't need to do anything here just providing the method
        }
        unobserve() {
            // We don't need to do anything here just providing the method
        }
        disconnect() {
            // We don't need to do anything here, just providing the method
        }
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

    let shimmedFilePath = {
        'sap/ui/thirdparty/jquery-mobile-custom': true,
        'sap/ui/thirdparty/jquery-mobile-custom-dbg': true,
        'sap/ui/thirdparty/hasher': true,
        'sap/ui/thirdparty/hasher.js': true,
        'sap/ui/thirdparty/signals': true,
        'sap/ui/thirdparty/signals.js': true
    };
    let pathMapping = {
        ui5loader: path.resolve(__dirname, './shim/ui5loader.js'),
        'ui5loader-dbg': path.resolve(__dirname, './shim/ui5loader.js')
    };
    if (isV2) {
        shimmedFilePath = {
            'sap/ui/thirdparty/jquery': true,
            'sap/ui/thirdparty/jquery.js': true,
            'sap/ui/thirdparty/jquery-dbg': true,
            'sap/ui/thirdparty/jquery-mobile-custom': true,
            'sap/ui/thirdparty/jquery-mobile-custom,js': true,
            'sap/ui/thirdparty/jquery-mobile-custom-dbg': true,
            'sap/ui/thirdparty/jquery-mobile-compat': true,
            'sap/ui/thirdparty/jquery-mobile-compat,js': true,
            'sap/ui/thirdparty/jquery-mobile-compat-dbg': true
        };
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
        jest: globalWindow.jestUI5,
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
