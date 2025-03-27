import { existsSync } from 'fs';
import type { CheckIntegrityResult, Content, ContentIntegrity, FileIntegrity, Integrity } from '../types';
import { findProjectRoot, getContentIntegrity, getCsnIntegrity, getFileIntegrity } from './hash';
import { writeIntegrityData } from './persistence';
import { join } from 'path';

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
        files: await checkFileIntegrity(integrityData),
        additionalStringContent: checkContentIntegrity(integrityData.contentIntegrity, additionalStringContent)
    };
}

/**
 * Check an array of file hashes against the current state of the files.
 *
 * @param fileIntegrity - array of file integrity data
 * @returns - results of the check
 */
async function checkFileIntegrity(integrityData: Integrity): Promise<CheckIntegrityResult['files']> {
    const differentFiles: CheckIntegrityResult['files']['differentFiles'] = [];
    const equalFiles: string[] = [];
    const checkFiles: FileIntegrity[] = [];
    const updatedIntegrityData = structuredClone(integrityData);

    const fileIntegrity = updatedIntegrityData.fileIntegrity;
    for (const integrity of fileIntegrity) {
        if (!existsSync(integrity.filePath)) {
            differentFiles.push({ filePath: integrity.filePath, oldContent: integrity.content, newContent: '' });
        } else {
            checkFiles.push(integrity);
        }
    }
    const newFileIntegrityArray = await getFileIntegrity(checkFiles.map((fileIntegrity) => fileIntegrity.filePath));
    const projectRoot = findProjectRoot(newFileIntegrityArray[0].filePath);

    const newCsnIntegrity = await getCsnIntegrity(projectRoot!);
    for (const newFileIntegrity of newFileIntegrityArray) {
        const oldFileIntegrity = checkFiles.find((fileHash) => fileHash.filePath === newFileIntegrity.filePath);
        /**
         * 1. if csn integrity is different and file integrity is different, then it is un-compatible changes. Show difference.
         * 2. if csn integrity is the same and file integrity is different, then none breaking change is made (e.g empty spaces, new lines or comments) - update the file integrity
         * 3. if csn integrity is different, but file integrity is same, then CDS compiler might have produced different CSN. Update the csn integrity
         */
        if (oldFileIntegrity && oldFileIntegrity.hash === newFileIntegrity.hash) {
            // file same, csn different. CDS compiler might have produced different CSN. Update the csn integrity
            if (newCsnIntegrity !== integrityData.csnIntegrity) {
                updatedIntegrityData.csnIntegrity = newCsnIntegrity;
            }
            equalFiles.push(oldFileIntegrity.filePath);
        } else {
            // file different, csn different. un-compatible changes
            if (newCsnIntegrity !== integrityData.csnIntegrity) {
                differentFiles.push({
                    filePath: newFileIntegrity.filePath,
                    oldContent: oldFileIntegrity?.content,
                    newContent: newFileIntegrity.content
                });
            }
            if (newCsnIntegrity === integrityData.csnIntegrity) {
                // file different, csn same. compatible change (e.g empty spaces, new lines or comments) - update the file integrity
                const [newData] = await getFileIntegrity([newFileIntegrity.filePath]);
                updatedIntegrityData.fileIntegrity.forEach((entry) => {
                    if (entry.filePath === newData.filePath) {
                        entry.hash = newData.hash;
                        entry.content = newData.content;
                    }
                });
                // add it to equal files
                equalFiles.push(newFileIntegrity.filePath);
            }
        }
    }
    
    await writeIntegrityData(join(projectRoot!, '.fiori-ai', 'ai-integrity.json'), updatedIntegrityData);

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
