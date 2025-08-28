import type { ToolsLogger } from '@sap-ux/logger';
import type { Manifest } from '@sap-ux/project-access';

import { downloadAppContent } from './html5-repo';
import type { CFConfig, AppParams } from '../../types';

/**
 * App Content Service - Handles app content downloading and manifest management.
 */
export class AppContentService {
    /**
     * The apps' manifests.
     */
    private manifests: Manifest[] = [];
    /**
     * The HTML5 repo runtime GUID.
     */
    private html5RepoRuntimeGuid: string = '';

    /**
     * Constructor.
     *
     * @param {ToolsLogger} logger - The logger.
     */
    constructor(private logger: ToolsLogger) {}

    /**
     * Get all stored manifests.
     *
     * @returns {Manifest[]} All manifests
     */
    public getManifests(): Manifest[] {
        return this.manifests;
    }

    /**
     * Download app content and extract manifest.
     *
     * @param {AppParams} appParams - The app parameters
     * @param {CFConfig} cfConfig - The CF configuration
     * @returns {Promise<{entries: any[], serviceInstanceGuid: string, manifest: Manifest}>} The downloaded content
     */
    public async getAppContent(
        appParams: AppParams,
        cfConfig: CFConfig
    ): Promise<{
        entries: any[];
        serviceInstanceGuid: string;
        manifest: Manifest;
    }> {
        const { entries, serviceInstanceGuid, manifest } = await downloadAppContent(
            cfConfig.space.GUID,
            appParams,
            this.logger
        );

        // Store the manifest and runtime GUID
        this.manifests.push(manifest);
        this.html5RepoRuntimeGuid = serviceInstanceGuid;

        return { entries, serviceInstanceGuid, manifest };
    }

    /**
     * Get the manifest by base app id.
     *
     * @param {string} appId - The app id
     * @returns {Manifest | undefined} The manifest
     */
    public getManifestByBaseAppId(appId: string): Manifest | undefined {
        return this.manifests.find((manifest) => manifest['sap.app'].id === appId);
    }

    /**
     * Get the HTML5 repo runtime GUID.
     *
     * @returns {string} The runtime GUID.
     */
    public getHtml5RepoRuntimeGuid(): string {
        return this.html5RepoRuntimeGuid;
    }
}
