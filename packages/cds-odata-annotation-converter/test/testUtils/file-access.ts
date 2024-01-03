import { join } from 'path';
import * as fs from 'fs';
import type { File } from '@sap/ux-cds-compiler-facade';

export const readFile = (path: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        fs.readFile(
            path,
            {
                encoding: 'utf-8'
            },
            (error, data) => {
                if (!error) {
                    resolve(data);
                } else {
                    reject(error);
                }
            }
        );
    });
};

export const getFileObj = async (root: string, fileUri: string): Promise<File> => {
    const fileContent = await readFile(join(root, fileUri));
    return { fileUri, fileContent };
};
