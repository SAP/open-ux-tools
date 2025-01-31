// delegate further initialization of this library to the Core
// Hint: sap.ui.getCore() must still be used here to support preload with sync bootstrap!
Lib.init({
    name: 'test.ui5.typescript.library1',
    version: '${version}',
    dependencies: [
        // keep in sync with the ui5.yaml and .library files
        'sap.ui.core'
    ],
    types: ['test.ui5.typescript.library1.ExampleColor'],
    interfaces: [],
    controls: ['test.ui5.typescript.library1.Example'],
    elements: [],
    noLibraryCSS: false, // if no CSS is provided, you can disable the library.css load here
    apiVersion: 2
});
