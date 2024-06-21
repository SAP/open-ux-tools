QUnit.config.autostart = false;
sap.ui.require(<%- JSON.stringify(tests) %>, function() {
    QUnit.start();
});
