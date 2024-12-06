const fs = require('fs');
const mockXHR = require('./mockXHR');
/**
 * Initializes the UI5 environment for the Jest tests.
 * @param {object} globalWindow The global window object.
 * @param {Function} pathMappingFn The path mapping function.
 * @param {boolean} isV2  Whether the environment is for UI5 V2.
 * @param {object} [ui5Version] The UI5 version object.
 * @returns {void}
 */
function initUI5Environment(globalWindow, pathMappingFn, isV2, ui5Version) {
    const mockData = {};

    globalWindow.jestSetup = true;

    globalWindow.XMLHttpRequest = function () {
        return mockXHR(globalWindow, pathMappingFn, shimmedFilePath, mockData);
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
    globalWindow.pathMappingFn = pathMappingFn;

    if (ui5Version) {
        mockData['sap-ui-version.json'] = JSON.stringify(ui5Version);
    }
    globalWindow.jestUI5 = {
        resolvePath: function (sPath) {
            return pathMappingFn(sPath);
        },
        registerMockMetadata: function (sPath, dataOrPath) {
            mockData[`${sPath}$metadata`] = dataOrPath;
        },
        mockUrl: function (sPath, dataOrPath) {
            mockData[`${sPath}`] = dataOrPath;
        }
    };

    globalWindow.sap = {};
}

module.exports.initUI5Environment = initUI5Environment;
