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
            name: 'sap.s4h.cfnd.featuretoggle',
            version: '${version}',
            dependencies: ['sap.ui.core'],
            types: [],
            interfaces: [],
            controls: [
                'sap.s4h.cfnd.featuretoggle.lib.featuresAsync',
                /*sap.s4h.cfnd.featuretoggle.lib.features - Synchronous API which is deprecated ,
				sap.s4h.cfnd.featuretoggle.lib.cacheValidator - Should not be used externally */
                'sap.s4h.cfnd.featuretoggle.lib.features',
                'sap.s4h.cfnd.featuretoggle.lib.cacheValidator'
            ],
            elements: [],
            noLibraryCSS: true
        });

        return sap.s4h.cfnd.featuretoggle.lib;
    },
    false
);
