import type { SystemInfo } from 'abap/types';
import { AdtService } from './adt-service';

/**
 * Retrieve system information using the ADT endpoint
 */
export class SystemInfoService extends AdtService {
    /**
     * Send ADT request to fetch ATO settings.
     *
     * @returns AtoSettings
     */
    public async getSystemInfo(): Promise<SystemInfo | undefined> {
        const acceptHeaders = {
            headers: {
                Accept: 'application/vnd.sap.adt.core.http.systeminformation.v1+json'
            }
        };
        const response = await this.get('/sap/bc/adt/core/http/systeminformation', acceptHeaders);
        if (typeof response.data === 'string') {
            try {
                return JSON.parse(response.data);
            } catch (parseError) {
                this.log.error(`System info could not be parsed from response. Error: ${parseError.message}`);
            }
        } else {
            return response.data;
        }
    }
}
