import { AdtService } from './adt-service';
import type { AdtCategory } from '../../types';

export type BusinessObject = {
    name: string;
    uri: string;
    package: string;
};

type ContentsResponse = {
    virtualFoldersResult?: {
        object?: BusinessObject[];
    };
};

export class VirtualFoldersService extends AdtService {
    /**
     * @see AdtService.getAdtCatagory()
     */
    private static adtCategory = {
        scheme: 'http://www.sap.com/adt/categories/repository',
        term: 'virtualfolders'
    };

    /**
     * Get ADT scheme ID.
     *
     * @returns AdtCategory
     */
    public static getAdtCatagory(): AdtCategory {
        return VirtualFoldersService.adtCategory;
    }

    public async getBusinessObjects(): Promise<BusinessObject[]> {
        const postData = `<?xml version="1.0" encoding="UTF-8"?>
            <vfs:virtualFoldersRequest xmlns:vfs="http://www.sap.com/adt/ris/virtualFolders" objectSearchPattern="*">
            <vfs:preselection facet="api">
                <vfs:value>USE_IN_CLOUD_DEVELOPMENT</vfs:value>
            </vfs:preselection>
            <vfs:preselection facet="group">
                <vfs:value>CORE_DATA_SERVICES</vfs:value>
            </vfs:preselection>
            <vfs:preselection facet="type">
                <vfs:value>BDEF</vfs:value>
            </vfs:preselection>
            <vfs:facetorder/>
            </vfs:virtualFoldersRequest>`;
        const response = await this.post('/contents', postData, {
            headers: {
                'Content-Type': 'application/vnd.sap.adt.repository.virtualfolders.request.v1+xml',
                Accept: 'application/vnd.sap.adt.repository.virtualfolders.result.v1+xml'
            }
        });
        const data = this.parseResponse<ContentsResponse>(response.data);
        return data.virtualFoldersResult?.object ?? [];
    }
}
