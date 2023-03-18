import { AdtService } from './adt-service';
import type { AdtCategory } from '../../types';

/**
 * FileStoreService implements ADT requests to obtain the content
 * of deployed archive.
 *
 * @class
 */
export class FileStoreService extends AdtService {
    /**
     * @see AdtService.getAdtCatagory()
     */
    private static adtCategory = {
        scheme: 'http://www.sap.com/adt/categories/filestore',
        term: 'filestore-ui5-bsp'
    };

    /**
     * Get ADT scheme ID.
     *
     * @returns AdtCategory
     */
    public static getAdtCatagory(): AdtCategory {
        return FileStoreService.adtCategory;
    }

    /**
     *
     * @param appName Deployed Fiori application name
     */
    public async getArchiveStructure(appName: string): Promise<string> {
        const config = {
            headers: {
                Accept: 'application/xml'
            }
        };

        const response = await this.get(`/${appName}/content`, config);
        return this.parseArchiveStructureResponse(response.data);
    }

    /**
     *
     * @param appName Deployed Fiori application name
     * @param filePath File path and name of a specific file in the deployed archive
     */
    public async getArchiveFileContent(appName: string, filePath: string): Promise<string> {
        const config = {
            headers: {
                Accept: 'application/xml'
            }
        };

        const response = await this.get(`/${appName}/${filePath}/content`, config);
        return this.parseArchiveFileContentResponse(response.data);
    }

    private parseArchiveStructureResponse(xml: string): string {
        console.log(xml);
        return '';
    }

    private parseArchiveFileContentResponse(xml: string): string {
        console.log(xml);
        return '';
    }
}
