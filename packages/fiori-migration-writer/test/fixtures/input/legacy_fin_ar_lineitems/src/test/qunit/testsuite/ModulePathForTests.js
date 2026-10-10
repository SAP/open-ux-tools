jQuery.sap.declare("fin.ar.lineitems.display.test.testsuite.ModulePathForTests");
fin.ar.lineitems.display.test.testsuite.ModulePathForTests = {
	isInWebIde: function() {
		var oUri = URI(window.location.href);
		return (oUri.path().indexOf("/src/test/qunit") > -1);
	},
	getPathToRoot: function() {
		/*
		 * Calculate how many ../ are needed to reach a path with only one segment This would either be /src for Web IDE or /<App Name> for Tomcat
		 */
		var iGoUp = URI(window.location.href).segment().length - 2;
		var sRel = "";
		for (var i = 0; i < iGoUp; i++) {
			sRel += "../";
		}
		// check whether running in SAP Web IDE -> i.e. path contains /src/test/qunit
		// Tomcat resources are under /<App name>
		// SAP Web IDE => Resources are under /src/main/webapp
		if (this.isInWebIde()) {
			sRel = sRel + "main/webapp";
		}
		return sRel;
	},
	registerModulePathForTests: function(sComponent) {
		var sRel = this.getPathToRoot();
		jQuery.sap.registerModulePath(sComponent, sRel);
	},
	getPathToRootForLibrary: function() {
		/*
		 * Calculate how many ../ are needed to reach a path with only one segment This would either be /src for Web IDE or /<App Name> for Tomcat
		 */
		var iGoUp = URI(window.location.href).segment().length - 1;
		var sRel = "";
		for (var i = 0; i < iGoUp; i++) {
			sRel += "../";
		}
		return sRel;
	},
	registerLibraryPathForTests: function(sComponent) {
		//register library path is only needed for WEB-IDE. In eclipse and gerrit-voter this is done via pom.xml
		if (this.isInWebIde()) {
			var sRel = this.getPathToRootForLibrary();
			//replace all . with /
			sRel += "resources/" + sComponent.replace(/\./g,"/");
			jQuery.sap.registerModulePath(sComponent, sRel);
		}
	}
};