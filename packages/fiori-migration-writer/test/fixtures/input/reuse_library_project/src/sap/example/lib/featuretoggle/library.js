/*!
 * ${copyright}
 */

/**
 * Initialization Code and shared classes of library sap.s4hcfnd.fm.lib.fmftfeaturetoggle.
 */
sap.ui.define(
    ['jquery.sap.global', 'sap/ui/core/library'], // library dependency
    function () {
        'use strict';

        sap.ui.getCore().initLibrary({
            name: 'sap.example.lib.featuretoggle',
            version: '${version}',
            dependencies: ['sap.ui.core'],
            types: [],
            interfaces: [],
            controls: [
                'sap.example.lib.featuretoggle.lib.featuresAsync',
                /*sap.example.lib.featuretoggle.lib.features - Synchronous API which is deprecated ,
				sap.example.lib.featuretoggle.lib.cacheValidator - Should not be used externally */
                'sap.example.lib.featuretoggle.lib.features',
                'sap.example.lib.featuretoggle.lib.cacheValidator'
            ],
            elements: [],
            noLibraryCSS: true
        });

        return sap.example.lib.featuretoggle.lib;
    },
    false
);
