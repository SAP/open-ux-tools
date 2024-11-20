const JSDOMEnvironment = require('jest-environment-jsdom').default;
const { initTsConfigMappingStrategy } = require('./tsMappingStrategy');
const { initUi5MappingStrategy } = require('./ui5MappingStrategy');
const { initUI5Environment } = require('./ui5Environment');
const path = require('path');

/**
 * Define the custom environment for the jest tests that runs in a UI5 environment
 */
class UI5DOMEnvironment extends JSDOMEnvironment {
    /**
     * Create a new instance of the UI5DOMEnvironment.
     * @param {object} root0 The root object
     * @param {object} root0.globalConfig The global jest configuration
     * @param {object} root0.projectConfig The  project jest configuration
     * @param {object} context The context of the test
     */
    constructor({ globalConfig, projectConfig }, context) {
        super({ globalConfig, projectConfig }, context);
        const config = projectConfig;
        config.setupFiles.push(path.join(__dirname, 'automaticSetup.js'));
        // Init global
        this.testEnvironmentOptions = config.testEnvironmentOptions;
        this.mappingStrategy = config.testEnvironmentOptions ? config.testEnvironmentOptions.mappingStrategy : 'ui5';
        this.useOptimized = config.testEnvironmentOptions ? !config.testEnvironmentOptions.useDebugSources : true;

        // make sure that the test path is in POSIX style:
        //   C:\dir1\dir2 --> /dir1/dir2
        //   /dir1/dir2   --> /dir1/dir2
        this.testPath = path.posix.join('/', ...context.testPath.split(path.sep).slice(1));
    }

    /**
     * Prepare the environment for the test.
     * This is called before each test and will setup the UI5 environment.
     * @returns {Promise<void>} A promise that resolves when the environment is ready
     */
    async setup() {
        let pathMappingFn;
        if (this.mappingStrategy === 'tsconfig') {
            pathMappingFn = await initTsConfigMappingStrategy(this.testEnvironmentOptions);
        } else {
            pathMappingFn = await initUi5MappingStrategy(this.testEnvironmentOptions);
        }
        await super.setup();
        const context = this.getVmContext();
        initUI5Environment(context, pathMappingFn, this.testEnvironmentOptions.isV2 ?? false);
        context.testPath = this.testPath;
        global.window = context;
        global.Object = context.Object;
        global.CanvasRenderingContext2D = function () {};
        context.HTMLCanvasElement.prototype.getContext = () => {};
        window.NewObject = Object;
        [
            'sap',
            'navigator',
            'location',
            'top',
            'self',
            'parent',
            'history',
            'document',
            'XMLHttpRequest',
            'HTMLScriptElement',
            'performance',
            'DOMParser'
        ].forEach((keyName) => {
            global[keyName] = context[keyName];
        });
        window.console = console;
        window.CanvasRenderingContext2D = function () {};
        window.matchMedia = (query) => ({
            matches: false,
            media: query,
            onchange: null,
            addListener: () => {}, // deprecated
            removeListener: () => {}, // deprecated
            addEventListener: () => {},
            removeEventListener: () => {},
            dispatchEvent: () => {}
        });
        window['sap-ui-optimized'] = this.useOptimized;
        window['sap-ui-no-preload'] = !this.useOptimized;
        window.requireFn(path.join(__dirname, 'shim', 'ui5loader'));
        if (this.testEnvironmentOptions.isV2) {
            const scriptTag = window.document.createElement('script');
            scriptTag.setAttribute('src', './ui5loader-autoconfig.js');
            window.document.head.appendChild(scriptTag);
        } else {
            window['sap-ui-config'].excludejquerycompat = true;
            sap.ui.requireSync('ui5loader-autoconfig');
        }
        sap.ui.predefine('sap/ui/util/_FeatureDetection', {
            initialScrollPositionIsZero: () => {}
        });
        const Device = sap.ui.requireSync('sap/ui/Device');
        Device.browser.version = 111;
        Device.browser.name = 'cr';
        if (this.useOptimized) {
            try {
                sap.ui.requireSync('sap/ui/core/library-preload');
            } catch (e) {
                process.stdout.write("Couldn't use preload\n");
            }
        }
        sap.ui.loader.config({ async: true });
        delete window['sap-ui-config'].resourceRoots;
        if (!this.testEnvironmentOptions.isV2) {
            this.core = sap.ui.requireSync('sap/ui/core/Core');
            this.core.boot();
        }
        return new Promise((resolve) => {
            this.initUI5Core(resolve);
        });
    }

    /**
     * Initialize the UI5 Core and resolve once ready.
     * @param {Function} resolve The function to call once the core is ready
     */
    initUI5Core(resolve) {
        sap.ui.require(['sap/ui/core/Core', 'sap/ui/core/date/Gregorian'], async function (Core) {
            if (Core.ready) {
                await Core.ready();
                sap.ui.require(['sap/ui/core/Lib'], function (Lib) {
                    const fnInit = Lib.init;
                    Lib.init = function (mSettings) {
                        mSettings.noLibraryCSS = true;
                        return fnInit.call(this, mSettings);
                    };
                    resolve();
                });
            } else {
                Core.attachInit(function () {
                    sap.ui.require(
                        ['sap/ui/core/Lib'],
                        function (Lib) {
                            const fnInit = Lib.init;
                            Lib.init = function (mSettings) {
                                mSettings.noLibraryCSS = true;
                                return fnInit.call(this, mSettings);
                            };
                            resolve();
                        },
                        function (e) {
                            resolve();
                        }
                    );
                });
            }
        });
    }

    /**
     * @returns {object} The VM Context for the current environment
     */
    getVmContext() {
        if (this.dom) {
            const context = this.dom.getInternalVMContext();
            return context;
        }

        return null;
    }
}

module.exports = UI5DOMEnvironment;
