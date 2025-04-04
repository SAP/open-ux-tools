import { existsSync } from 'fs';
import type { CheckIntegrityResult, Content, ContentIntegrity, FileIntegrity, Integrity } from '../types';
import { getContentIntegrity, getCsnIntegrity, getFileIntegrity } from './hash';

/**
 * Check existing integrity data.
 *
 * @param integrityData - integrity data
 * @param csnContent - Core Schema Notation (CSN) content
 * @param [additionalStringContent] - optional additional new string content
 * @returns - results of the check
 */
export async function checkIntegrity(
    integrityData: Integrity,
    csnContent: string,
    additionalStringContent?: Content
): Promise<CheckIntegrityResult> {
    return {
        files: await checkFileIntegrity(integrityData, csnContent),
        additionalStringContent: checkContentIntegrity(integrityData.contentIntegrity, additionalStringContent)
    };
}

/**
 * Check an array of file hashes against the current state of the files.
 *
 * @param integrityData - integrity data
 * @param csnContent - Core Schema Notation (CSN) content
 * @returns - results of the check
 */
async function checkFileIntegrity(
    integrityData: Integrity,
    csnContent: string
): Promise<CheckIntegrityResult['files']> {
    const differentFiles: CheckIntegrityResult['files']['differentFiles'] = [];
    const equalFiles: string[] = [];
    const checkFiles: FileIntegrity[] = [];
    const fileIntegrity = integrityData.fileIntegrity;
    const csnIntegrity = integrityData.csnIntegrity;

    for (const integrity of fileIntegrity) {
        if (!existsSync(integrity.filePath)) {
            differentFiles.push({ filePath: integrity.filePath, oldContent: integrity.content, newContent: '' });
        } else {
            checkFiles.push(integrity);
        }
    }
    const newFileIntegrityArray = await getFileIntegrity(checkFiles.map((fileIntegrity) => fileIntegrity.filePath));
    const newCsnIntegrity = await getCsnIntegrity(csnContent);
    /**
     * 1. if csn integrity is different and file integrity is different, then it is un-compatible changes. Add to difference files.
     * 2. if csn integrity is the same, but file integrity is different, then is compatible changes (e.g empty spaces, new lines or comments). Add to equal files.
     * 3. if csn integrity is different, but file integrity is same, then CDS compiler might have produced different CSN. Add to equal files.
     */
    for (const newFileIntegrity of newFileIntegrityArray) {
        const oldFileIntegrity = checkFiles.find((fileHash) => fileHash.filePath === newFileIntegrity.filePath);
        if (oldFileIntegrity && oldFileIntegrity.hash !== newFileIntegrity.hash && csnIntegrity !== newCsnIntegrity) {
            // case 1.
            differentFiles.push({
                filePath: newFileIntegrity.filePath,
                oldContent: oldFileIntegrity?.content,
                newContent: newFileIntegrity.content
            });
            continue;
        }
        // case 2 and 3.
        equalFiles.push(newFileIntegrity.filePath);
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
    const oldContentIntegrityArray = structuredClone(contentIntegrity);
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
