jQuery.sap.declare("<%- project.name %>.test.ModulePathForTests");
<%- project.name %>.test.ModulePathForTests = {
    isInWebIde: function() {
        var oUri = URI(window.location.href);
        return oUri.path().indexOf('/webapp/test/qunit') > -1;
    },
    getPathToRoot: function() {
        /*
         * Calculate how many ../ are needed to reach a path with only one segment
         */
        var number =
            window.location.href.indexOf("/webapp/test/") !== -1
                ? 3
                : 1;
        var iGoUp = URI(window.location.href).segment().length - number;
        var sRel = '';
        for (var i = 0; i < iGoUp; i++) {
            sRel += '../';
        }
        // check whether running in SAP Web IDE -> i.e. path contains /src/test/qunit
        // Tomcat resources are under /<App name>
        // SAP Web IDE => Resources are under /src/main/webapp
        if (this.isInWebIde()) {
            sRel = sRel + 'webapp';
        }
        return sRel;
    },
    registerModulePathForTests: function(sComponent) {
        var sRel = this.getPathToRoot();
        jQuery.sap.registerModulePath(sComponent, sRel);
    },
    getPathToRootForLibrary: function() {
        /*
         * Calculate how many ../ are needed to reach a path with only one segment
         */
        var iGoUp = URI(window.location.href).segment().length - 1;
        var sRel = '';
        for (var i = 0; i < iGoUp; i++) {
            sRel += '../';
        }
        return sRel;
    },
    registerLibraryPathForTests: function(sComponent) {
        //register library path is only needed for WEB-IDE. In eclipse and gerrit-voter this is done via pom.xml
        if (this.isInWebIde()) {
            var sRel = this.getPathToRootForLibrary();
            //replace all . with /
            sRel += 'resources/' + sComponent.replace(/\./g, '/');
            jQuery.sap.registerModulePath(sComponent, sRel);
        }
    }
};
