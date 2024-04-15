/*!
 * ${copyright}
 */

/**
 * Initialization Code and shared classes of library sap.reuse.ex.test.lib.attachmentservice.
 */
sap.ui.define(
    ['jquery.sap.global', 'sap/ui/core/library'], // library dependency
    function (jQuery) {
        'use strict';

        /**
         *
         *
         * @namespace
         * @name sap.reuse.ex.test.lib.test
         * @author SAP SE
         * @version ${version}
         * @public
         */

        // delegate further initialization of this library to the Core
        sap.ui.getCore().initLibrary({
            name: 'sap.reuse.ex.test.lib.attachmentservice',
            version: '${version}',
            noLibraryCSS: true,
            dependencies: ['sap.ui.core', 'sap.m', 'sap.test.feature'],
            types: [],
            interfaces: [],
            controls: ['sap.reuse.ex.test.lib.attachmentservice.controls.Example'],
            elements: []
        });

        return sap.reuse.ex.test.lib.attachmentservice;
    },
    /* bExport= */ false
);
