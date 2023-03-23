import { AdtService } from './adt-service';
import type { AdtCategory, ArchiveFileNode, ArchiveFileNodeType } from '../../types';
import XmlParser from 'fast-xml-parser';
import type { AdtFileNode } from 'abap/types/adt-internal-types';

type ReturnType<T> = T extends 'file' ? string : T extends 'folder' ? ArchiveFileNode[] : never;

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
     * If target `path` is a file, the file content is returned as string type.
     * If target `path` is a folder, files and folders in this folder are returned as an array list
     * of ArchiveFileNode objects.
     * @see ArchiveFileNode
     *
     * @param path Path to a folder / file in the deployed archive
     * @param type
     *  Specifies if input `path` refers to a file or a folder. When starting exploring
     *  the file structure from the root, type should be set to `folder`. The type information
     *  of files and folders inside root folder can be found in the returned `ArchiveFileNode` entries.
     * @returns Folder content (ArchiveFileNode[]) | file content (string)
     */
    public async getAppArchiveContent<T extends ArchiveFileNodeType>(path: string, type: T): Promise<ReturnType<T>> {
        const contentType = type === 'folder' ? 'application/atom+xml' : 'application/octet-stream';
        const config = {
            headers: {
                Accept: 'application/xml',
                'Content-Type': contentType
            }
        };

        const response = await this.get(`/${path}/content`, config);
        return this.parseArchiveContentResponse(response.data, type);
    }

    /**
     * Parse response data from ADT service. If the content is XML document of
     * folder structure, this method returns a list of `ArchiveFileNode` object. If the content
     * is text string, this method returns the text cotent.
     * @see ArchiveFileNode
     *
     * @param responseData Response from ADT service
     * @param type Reponse data is the file content or folder content.
     * @returns Folder content (ArchiveFileNode[]) | file content (string)
     */
    private parseArchiveContentResponse<T extends ArchiveFileNodeType>(responseData: string, type: T): ReturnType<T> {
        // File content that is not xml data.
        if (type === 'file' || XmlParser.validate(responseData) !== true) {
            return responseData as ReturnType<T>;
        }
        // A list of file/folder items in the response data as xml string.
        const options = {
            attributeNamePrefix: '',
            ignoreAttributes: false,
            ignoreNameSpace: true,
            parseAttributeValue: true
        };
        const obj = XmlParser.getTraversalObj(responseData, options);
        const parsed = XmlParser.convertToJson(obj, options);

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
                fullPath: fileNode.title,
                queryPath: encodeURIComponent(fileNode.title),
                type: fileNode.category.term
            } as ArchiveFileNode;

            return exposedFileNode;
        }) as ReturnType<T>;
    }
}
