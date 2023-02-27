/**
 * This type is used internally for the list of PacakgeInfo
 * returned from ADT rest api. It should not be exposed for
 * public use via axios-extension.
 */
export interface PackageInfo {
    uri: string; // Relative URL path for querying this specific package: e.g. /sap/bc/adt/packages/<packageNameSmallCase>
    type: string; // Object type
    name: string; // Package name
}
