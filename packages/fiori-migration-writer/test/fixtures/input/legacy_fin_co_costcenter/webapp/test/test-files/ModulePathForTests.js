/*global window */
jQuery.sap.declare("fin.co.costcenter.manage.test.ModulePathForTests");

fin.co.costcenter.manage.test.ModulePathForTests = {
    isInWebIDE: function() {
        var oUri = URI(window.location.href);
        return (oUri.path().indexOf("/src/test/qunit") > -1);
    },
    getPathToRoot: function() {
        /* Calculate how many ../ are needed to reach a path with only one segment
         * This would either be /src for RDE or /<App Name> for Tomcat
         */
        var iGoUp = URI(window.location.href).segment().length - 2;
        var sRel = "";
        for (var i = 0; i < iGoUp; i++) {
            sRel += "../";
        }
        // check whether running in WebIDE -> i.e. path contains /src/test/qunit
        // Tomcat resources are under /<App name>
        // WebIDE => Resources are under /src/main/webapp
        if (this.isInWebIDE()) {
            sRel = sRel + "main/webapp";
        }
        return sRel;
    },
    registerModulePathForTests: function(sComponent) {
        var sRel = this.getPathToRoot();
        jQuery.sap.registerModulePath(sComponent, sRel);
    }
};