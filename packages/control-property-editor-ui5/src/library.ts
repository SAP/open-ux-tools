import ObjectPath from "sap/base/util/ObjectPath";

/**
 * Initialization Code and shared classes of library com.sap.ux.cpe.
 */

// delegate further initialization of this library to the Core
// Hint: sap.ui.getCore() must still be used here to support preload with sync bootstrap!
sap.ui.getCore().initLibrary({
	name: "com.sap.ux.cpe",
	version: "${version}",
	dependencies: [
		"sap.ui.core"
	]
});

// get the library object from global object space because all enums must be attached to it to be usable as UI5 types
// FIXME: this line is planned to become obsolete and may need to be removed later
const thisLib: { [key: string]: unknown } = ObjectPath.get("com.sap.ux.cpe") as { [key: string]: unknown };

// export the library namespace
export default thisLib;