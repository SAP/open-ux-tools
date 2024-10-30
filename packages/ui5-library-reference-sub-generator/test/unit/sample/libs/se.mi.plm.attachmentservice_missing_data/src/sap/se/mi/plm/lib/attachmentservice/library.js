/*!
 * ${copyright}
 */

/**
 * Initialization Code and shared classes of library sap.se.mi.plm.lib.attachmentservice.
 */
sap.ui.define(
    ['jquery.sap.global', 'sap/ui/core/library'], // library dependency
    function(jQuery) {
        'use strict';

        /**
         *
         *
         * @namespace
         * @name sap.se.mi.plm.lib.test
         * @author SAP SE
         * @version ${version}
         * @public
         */

        // delegate further initialization of this library to the Core
        sap.ui.getCore().initLibrary({
            name: 'sap.se.mi.plm.lib.attachmentservice',
            version: '${version}',
            noLibraryCSS: true,
            dependencies: ['sap.ui.core', 'sap.m', 'sap.s4h.cfnd.featuretoggle'],
            types: [],
            interfaces: [],
            controls: ['sap.se.mi.plm.lib.attachmentservice.controls.Example'],
            elements: []
        });

        return sap.se.mi.plm.lib.attachmentservice;
    },
    /* bExport= */ false
);
