sap.ui.define(['<%- appMigratorSrcComponentToReplace %>'], function(AppComponent) {
	return AppComponent.extend("<%- appId %>.Component", {
		metadata: {
			manifest: "json"
		}
	});
});
