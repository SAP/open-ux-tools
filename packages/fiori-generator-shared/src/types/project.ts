/**
 * Base configuration for Fiori application projects.
 *
 * This interface defines the core properties shared across all Fiori generators
 * (app-sub-generator, migration-writer, etc.). Domain-specific generators should
 * extend this interface with their additional fields.
 */
export interface BaseProjectConfig {
    /** Target folder path for the generated/migrated project */
    targetFolder: string;

    /** Whether to add deployment configuration */
    addDeployConfig?: boolean;

    /** Whether to add Fiori Launchpad configuration */
    addFlpConfig?: boolean;

    /** Project name */
    name: string;

    /** Project namespace */
    namespace?: string;

    /** Project title */
    title: string;

    /** Project description */
    description: string;

    /** UI5 theme to use */
    ui5Theme: string;

    /** UI5 version to use */
    ui5Version: string;

    /** URL providing UI5 libraries (set to default if not provided) */
    ui5FrameworkUrl?: string;

    /** Local UI5 version for offline development */
    localUI5Version: string;

    /** Whether this is a SAP UX project */
    sapux?: boolean;

    /** Whether to skip annotation handling */
    skipAnnotations?: boolean;

    /** Whether this is a form entry project */
    formEntry?: boolean;

    /** FLP app ID (concatenation of semanticObject-action for navigation intent) */
    flpAppId?: string;

    /** Minimum supported UI5 version based on floorplan and OData version */
    minSupportedUI5Version?: string;

    /** UI5 version for manifest.json minUI5Version */
    manifestMinUI5Version?: string;
}
