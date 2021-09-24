export interface Package {
	name: string;
	version?: string;
	description?: string;
	scripts?: Record<string, string>;
	dependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
	ui5?: {
		dependencies?: string[];
	}
}

export interface App {
	id: string;
	uri?: string; // What is this?
	version?: string; // What is this?
	title?: string;
	description?: string;
	baseComponent?: string; // UI5 Component `required` by Component.js
	flpAppId?: string;
	startFile?: string;
	localStartFile?: string;
}

export enum BootstrapSrc {
	CdnOpenUI5 = "Content delivery network (OpenUI5)",
	CdnSAPUI5 = "Content delivery network (SAPUI5)",
	Local = "Local Resources"
}
export interface UI5 {
	minUI5Version?: string;
	version?: string;
	localVersion?: string;
	typesVersion?: string;
	descriptorVersion?: string;
	ui5Libs?: string | string[];
	ui5Theme?: string;
	initialViewName?: string; // scaffolding-time: dynamic view name
	initialControllerName?: string; // scaffolding-time: dynamic controller name
	bootstrapSrc?: BootstrapSrc; // scaffolding-time: where to consume the bootstrap resources from (cdn, local)
}

// Additional configurable features
export interface AppOptions {
	codeAssist?: boolean; // Enables code assist
    eslint?: boolean; // Enables Fiori linting
    sapux?: boolean; // Enables Fiori Tools Suite integration
}

export interface Ui5App {
	app: App;
	appOptions?: AppOptions;
	ui5?: UI5;
	package: Package;
}
