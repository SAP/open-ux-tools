/*!
 * ${copyright}
 */

/**
 * Initialization Code and shared classes of library com.example.ui5.library.
 */
sap.ui.define(['sap/ui/core/library'], function (coreLibrary) {
    'use strict';

    /**
     * UI5 library: com.example.ui5.library.
     *
     * @namespace
     * @alias com.example.ui5.library
     * @public
     */
    var thisLib = sap.ui.getCore().initLibrary({
        name: 'com.example.ui5.library',
        version: '1.0.0',
        dependencies: ['sap.ui.core'],
        types: [],
        interfaces: [],
        controls: ['com.example.ui5.library.ExampleControl'],
        elements: [],
        noLibraryCSS: false
    });

    return thisLib;
});
