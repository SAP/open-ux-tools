/**
 * Test constants for migration integration tests
 *
 * These use safe dummy URLs that are appropriate for open-source testing
 */

/**
 * Dummy backend URL for testing backend proxy configuration
 * Using example.com domain which is reserved for documentation/testing
 */
export const DUMMY_BACKEND_URL = 'https://backend.example.com:44300';

/**
 * Alternative dummy backend for multi-destination tests
 */
export const DUMMY_BACKEND_URL_2 = 'https://backend2.example.com:50001';

/**
 * SAP client parameter for backend connections (generic)
 */
export const DUMMY_SAP_CLIENT = '001';

/**
 * Destination name for backend connections (generic)
 */
export const DUMMY_DESTINATION = 'EXAMPLE_BACKEND';

/**
 * UI5 snapshot URL for testing (public SAP CDN)
 */
export const UI5_SNAPSHOT_URL = 'https://ui5.sap.com';

/**
 * Test project metadata for backend configuration
 */
export interface TestProjectConfig {
    name: string;
    backendUrl?: string;
    sapClient?: string;
    destination?: string;
}

/**
 * Default test configuration with backend
 */
export const DEFAULT_TEST_CONFIG: TestProjectConfig = {
    name: 'default',
    backendUrl: DUMMY_BACKEND_URL,
    sapClient: DUMMY_SAP_CLIENT,
    destination: DUMMY_DESTINATION
};

/**
 * Test configuration without backend (for projects that don't need it)
 */
export const NO_BACKEND_CONFIG: TestProjectConfig = {
    name: 'no-backend'
};
