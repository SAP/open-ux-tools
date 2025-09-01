import type AdmZip from 'adm-zip';

import type { ToolsLogger } from '@sap-ux/logger';
import type { Manifest } from '@sap-ux/project-access';

import { downloadAppContent } from './html5-repo';
import type { CfConfig, CfAppParams } from '../../types';

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
     * Download app content and extract manifest.
     *
     * @param {CfAppParams} appParams - The app parameters.
     * @param {CfConfig} cfConfig - The CF configuration.
     * @returns {Promise<{entries: AdmZip.IZipEntry[], serviceInstanceGuid: string, manifest: Manifest}>} The downloaded content
     */
    public async getAppContent(
        appParams: CfAppParams,
        cfConfig: CfConfig
    ): Promise<{
        entries: AdmZip.IZipEntry[];
        serviceInstanceGuid: string;
        manifest: Manifest;
    }> {
        const { entries, serviceInstanceGuid, manifest } = await downloadAppContent(
            cfConfig.space.GUID,
            appParams,
            this.logger
        );
        // TODO: This class will be removed when we change the validation and manifest retrieval logic when prompting
        this.manifests.push(manifest);
        this.html5RepoRuntimeGuid = serviceInstanceGuid;

        return { entries, serviceInstanceGuid, manifest };
    }

    /**
     * Get the manifest by base app id.
     *
     * @param {string} appId - The app id.
     * @returns {Manifest | undefined} The manifest.
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
