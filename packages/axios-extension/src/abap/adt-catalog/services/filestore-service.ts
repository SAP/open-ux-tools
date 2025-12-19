import { AdtService } from './adt-service';
import type { AdtCategory, ArchiveFileNode, ArchiveFileNodeType, ArchiveFileContentType } from '../../types';
import { XMLParser, XMLValidator } from 'fast-xml-parser';
import type { AdtFileNode } from 'abap/types/adt-internal-types';

/**
 * FileStoreService implements ADT requests to obtain the content
 * of deployed archive.
 */
export class FileStoreService extends AdtService {
    /**
     * @see AdtService.getAdtCatagory()
     */
    private static readonly adtCategory = {
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
     * If target `path` is a file, the file content is returned as string type.
     * If target `path` is a folder, files and folders in this folder are returned as an array
     * of ArchiveFileNode objects.
     *
     * @see ArchiveFileNode
     * @param type
     *  Specifies if input `path` refers to a file or a folder. When starting exploring
     *  the file structure from the root, type should be set to `folder`. The type information
     *  of files and folders inside root folder can be found in the returned `ArchiveFileNode` entries.
     * @param appName Deployed Fiori app name
     * @param path
     *   Default value is empty string. In this case the output would be folder structure information of the root folder.
     *   Otherwise provide path to a folder or a file in the deployed archive. E.g. `/webapp/index.html`.
     * @returns Folder content (ArchiveFileNode[]) | file content (string)
     */
    public async getAppArchiveContent<T extends ArchiveFileNodeType>(
        type: T,
        appName: string,
        path = ''
    ): Promise<ArchiveFileContentType<T>> {
        const contentType = type === 'folder' ? 'application/atom+xml' : 'application/octet-stream';
        const config = {
            headers: {
                Accept: 'application/xml',
                'Content-Type': contentType
            }
        };
        if (path && !path.startsWith('/')) {
            throw new Error('Input argument "path" needs to start with /');
        }
        const encodedFullPath = encodeURIComponent(`${appName}${path}`);
        const response = await this.get(`/${encodedFullPath}/content`, config);
        return this.parseArchiveContentResponse(appName, response.data, type);
    }

    /**
     * Parse response data from ADT service. If the content is XML document of
     * folder structure, this method returns a list of `ArchiveFileNode` object. If the content
     * is text string, this method returns the text cotent.
     *
     * @see ArchiveFileNode
     * @param appName Deployed Fiori app name
     * @param responseData Response from ADT service
     * @param type Reponse data is the file content or folder content.
     * @returns Folder content (ArchiveFileNode[]) | file content (string)
     */
    private parseArchiveContentResponse<T extends ArchiveFileNodeType>(
        appName: string,
        responseData: string,
        type: T
    ): ArchiveFileContentType<T> {
        // File content that is not xml data.
        if (type === 'file') {
            return responseData as ArchiveFileContentType<T>;
        }
        // A list of file/folder items in the response data as xml string.
        if (XMLValidator.validate(responseData) !== true) {
            throw new Error('Invalid XML content');
        }
        const options = {
            attributeNamePrefix: '',
            ignoreAttributes: false,
            ignoreNameSpace: true,
            parseAttributeValue: true,
            removeNSPrefix: true
        };
        const parser: XMLParser = new XMLParser(options);
        const parsed = parser.parse(responseData, true);

        let fileNodeArray: AdtFileNode[] = [];

        if (parsed?.feed) {
            if (Array.isArray(parsed.feed.entry)) {
                fileNodeArray = parsed.feed.entry;
            } else {
                fileNodeArray = [parsed.feed.entry];
            }
        }

        return fileNodeArray.map((fileNode) => {
            const exposedFileNode = {
                basename: fileNode.title.split('/').pop(),
                path: fileNode.title.substring(appName.length),
                type: fileNode.category.term
            } as ArchiveFileNode;

            return exposedFileNode;
        }) as ArchiveFileContentType<T>;
    }
}
