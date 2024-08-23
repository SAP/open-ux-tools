import { promises } from 'fs';
import { join, dirname } from 'path';
import { getAllNormalizeFolderPath, serialize, getBase, getFileContent } from '.';
import { FileFormat } from '../../../src/parser/types';
import { FileExtension } from './types';
import { parseProperties } from '../../../src/parser/properties/parser';
import { parseCsv } from '../../../src/parser/csv/parser';
export const update = async (format: FileFormat): Promise<void | Error> => {
    let BASE = '';
    let ext: FileExtension = FileExtension.properties;
    switch (format) {
        case FileFormat.properties:
            BASE = getBase([FileFormat.properties]);
            ext = FileExtension.properties;
            break;
        case FileFormat.csv:
            BASE = getBase([FileFormat.csv]);
            ext = FileExtension.csv;
            break;
        default:
            break;
    }
    const args = process.argv[2];
    const folderPath = getAllNormalizeFolderPath(ext, BASE);
    const allInput = folderPath.map((folder) => join(BASE, '..', folder, `input${ext}`));
    const tests = args ? [join(BASE, args, `input${ext}`)] : allInput;
    for (const test of tests) {
        try {
            const ROOT = dirname(test);
            const text = await getFileContent(test);
            if (ext === FileExtension.properties) {
                const { tokens, ast } = parseProperties(text);
                await promises.writeFile(join(ROOT, 'token.json'), serialize(tokens));
                await promises.writeFile(join(ROOT, 'ast.json'), serialize(ast));
            }
            if (ext === FileExtension.csv) {
                const { ast, tokens } = parseCsv(text);
                await promises.writeFile(join(ROOT, 'token.json'), serialize(tokens));
                await promises.writeFile(join(ROOT, 'ast.json'), serialize(ast));
            }
        } catch (error) {
            throw Error(`Failed to update: ${test}`);
        }
    }
};
