import ExtensionAPI from 'sap/fe/core/ExtensionAPI';
import Routing from 'sap/fe/core/controllerextensions/Routing';
import EditFlow from 'sap/fe/core/controllerextensions/EditFlow';
import IntentBasedNavigation from 'sap/fe/core/controllerextensions/IntentBasedNavigation';

/**
 * Missing public properties (https://ui5.sap.com/#/api/sap.fe.core.ExtensionAPI)
 */
interface ExtensionAPIProperties {
    routing: Routing;
    editFlow: EditFlow;
    intentBasedNavigation: IntentBasedNavigation;
}

/**
 * Add missing public properties
 */
declare module 'sap/fe/core/ExtensionAPI' {
	export default interface ExtensionAPI extends ExtensionAPIProperties {}
}

/**
 * Add missing public properties
 */
declare module 'sap/fe/templates/ObjectPage/ExtensionAPI' {
	export default interface ExtensionAPI extends ExtensionAPIProperties {}
}

/**
 * Add missing public properties
 */
declare module 'sap/fe/templates/ListReport/ExtensionAPI' {
	export default interface ExtensionAPI extends ExtensionAPIProperties {}
}

/**
 * Enhancing the PageController type to simplify the work with the extension API
 */
declare module 'sap/fe/core/PageController' {
	export default interface PageController {
		getExtensionAPI() : ExtensionAPI;
	}
}
