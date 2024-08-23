/**
 * Filter patterns for inclusion and exclusion
 *
 * If a file is mentioned in both, exclusion has higher priority
 */
export interface Filter {
    /**
     *  Array of glob patterns compatible with [`minimatch`](https://github.com/isaacs/minimatch)
     */
    include?: string[];
    /**
     *  Array of glob patterns compatible with [`minimatch`](https://github.com/isaacs/minimatch)
     */
    exclude?: string[];
}

/**
 * Matcher ignore regex pattern definitions. Used as an option for .toMatchFolder to replace dynamic
 * values in file snapshots.
 */
export interface MatcherIgnore {
    groups?: {
        /** Filename not including the preceding path */
        filenames: string[];
        /** Valid RegExp instances, note each additional expression results in another match scan of each file */
        ignore: RegExp[];
    }[];
}

export type MatcherOptions = { [option: string]: unknown } & Filter & MatcherIgnore;

// Sets of commonly used regex definitions to be used to ignore values in test UI5 application snapshot files
// Note: Lookbehind is used to simplify replacement of non-lookbehind portion only
export const MANIFEST_VERSIONS_REGEX = /(?<="minUI5Version": "|"version": "|"_version": ")(\d{1,3}.\d{1,3}.\d{1,3})/; // General version regex - only use if you explicitly dont want to test ui5 versions
export const MANIFEST_SOURCE_TEMPLATE_ID_REGEX = /(?<="sourceTemplate": {\s*"id": ").+(?=")/; // Match source template id as it appears manifest.json
export const MANIFEST_SOURCE_TEMPLATE_VERSION_REGEX = /(?<="sourceTemplate": {\s.*\s*"version": ").+(?=")/; // Match source template version as it appears manifest.json
export const MANIFEST_SOURCE_TEMPLATE_TOOLSID_REGEX = /(?<="sourceTemplate": {\s.*\s.*\s*"toolsId": ").+(?=")/; // Match source template toolsId as it appears in manifest.json
export const YAML_VERSION_REGEX = /(?<=version: )(\d{1,3}.\d{1,3}.\d{1,3})/; // Match ui5 version as it appears in the ui5-local.yaml file
export const README_UI5_VERSION_REGEX = /(?<=UI5 Version\*\*<br>)(.*)(?=\|\s)/; // Match the ui5 version in the readme.md file
export const README_GENERATOR_REGEX = /(?<=Generation Date and Time\*\*<br>|App Generator Version\*\*<br>)(.*)(?=\|\s)/; // Will match date string: |**Generation Date and Time**<br>Mon May 09 2022 12:37:29 GMT+0100 (Irish Standard Time)|
export const README_GENERATION_PLATFORM_REGEX = /(?<=Generation Platform\*\*<br>)(.*)(?=\|\s)/;
export const DEPLOY_YAML_APPNAME_REGEX = /(?<=app:\s.*\s*name: )(.*)(\d*)(?=)/; // Match the app name in the ui5-deploy.yaml file
export const PACKAGE_JSON_UI5_TYPES_VERSION = /(?<=@sapui5\/types: )(\d{1,3}.\d{1,3}.\d{1,3})/; // Match the UI5 types version in the package.json
