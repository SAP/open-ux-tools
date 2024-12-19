import { existsSync } from 'fs';
import type { CheckIntegrityResult, Content, ContentIntegrity, FileIntegrity, Integrity } from '../types';
import { getContentIntegrity, getFileIntegrity } from './hash';

/**
 * Check existing integrity data.
 *
 * @param integrityData - integrity data
 * @param [additionalStringContent] - optional additional new string content
 * @returns - results of the check
 */
export async function checkIntegrity(
    integrityData: Integrity,
    additionalStringContent?: Content
): Promise<CheckIntegrityResult> {
    return {
        files: await checkFileIntegrity(integrityData.fileIntegrity),
        additionalStringContent: checkContentIntegrity(integrityData.contentIntegrity, additionalStringContent)
    };
}

/**
 * Check an array of file hashes against the current state of the files.
 *
 * @param fileIntegrity - array of file integrity data
 * @returns - results of the check
 */
async function checkFileIntegrity(fileIntegrity: FileIntegrity[]): Promise<CheckIntegrityResult['files']> {
    const differentFiles: CheckIntegrityResult['files']['differentFiles'] = [];
    const equalFiles: string[] = [];
    const checkFiles: FileIntegrity[] = [];

    for (const integrity of fileIntegrity) {
        if (!existsSync(integrity.filePath)) {
            differentFiles.push({ filePath: integrity.filePath, oldContent: integrity.content, newContent: '' });
        } else {
            checkFiles.push(integrity);
        }
    }
    const newFileIntegrityArray = await getFileIntegrity(checkFiles.map((fileIntegrity) => fileIntegrity.filePath));
    for (const newFileIntegrity of newFileIntegrityArray) {
        const oldFileIntegrity = checkFiles.find((fileHash) => fileHash.filePath === newFileIntegrity.filePath);
        if (oldFileIntegrity && oldFileIntegrity.hash === newFileIntegrity.hash) {
            equalFiles.push(oldFileIntegrity.filePath);
        } else {
            differentFiles.push({
                filePath: newFileIntegrity.filePath,
                oldContent: oldFileIntegrity?.content,
                newContent: newFileIntegrity.content
            });
        }
    }
    return { differentFiles, equalFiles };
}

/**
 * Check old content integrity against new key->string values.
 *
 * @param contentIntegrity - existing content integrity from integrity data
 * @param additionalStringContent - new additional key->string values
 * @returns - result of the check
 */
function checkContentIntegrity(
    contentIntegrity: ContentIntegrity[],
    additionalStringContent?: Content
): CheckIntegrityResult['additionalStringContent'] {
    const oldContentIntegrityArray = JSON.parse(JSON.stringify(contentIntegrity)) as ContentIntegrity[];
    const differentContent: CheckIntegrityResult['additionalStringContent']['differentContent'] = [];
    const equalContent: string[] = [];

    const newContentIntegrityArray = getContentIntegrity(additionalStringContent);
    for (const newContentIntegrity of newContentIntegrityArray) {
        const index = oldContentIntegrityArray.findIndex(
            (content) => content.contentKey === newContentIntegrity.contentKey
        );
        let foundOldContentIntegrity;
        if (index > -1) {
            foundOldContentIntegrity = oldContentIntegrityArray[index];
            oldContentIntegrityArray.splice(index, 1);
        }
        if (foundOldContentIntegrity?.hash === newContentIntegrity.hash) {
            equalContent.push(newContentIntegrity.contentKey);
        } else {
            differentContent.push({
                key: newContentIntegrity.contentKey,
                newContent: newContentIntegrity.content,
                oldContent: foundOldContentIntegrity?.content
            });
        }
    }
    for (const missingContent of oldContentIntegrityArray) {
        differentContent.push({
            key: missingContent.contentKey,
            newContent: undefined,
            oldContent: missingContent.content
        });
    }
    return { differentContent, equalContent };
}
