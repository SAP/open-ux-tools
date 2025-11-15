import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, extname, basename } from 'node:path';

/* Temporary solution until specification package implements API */

type AppSpecification = {
    schemas: Record<string, object>;
    pages: Record<string, object>;
};

const schemasFolder = 'schemas';
const pagesFolder = 'pages';

/**
 * Loads all JSON files from a specified folder and returns their parsed content.
 *
 * @param folderPath - Path to the folder containing JSON files
 * @returns Object with filename (without extension) as key and parsed JSON content as value
 */
export function getSpecification(folderPath: string): AppSpecification {
    const result: AppSpecification = {
        schemas: {},
        pages: {}
    };

    // Check if folder exists
    if (!existsSync(folderPath)) {
        throw new Error(`Folder does not exist: ${folderPath}`);
    }

    // Check if schemas and pages folders exist
    const schemasPath = join(folderPath, schemasFolder);
    const pagesPath = join(folderPath, pagesFolder);

    if (!existsSync(schemasPath)) {
        throw new Error(`Schemas folder does not exist: ${schemasPath}`);
    }

    if (!existsSync(pagesPath)) {
        throw new Error(`Pages folder does not exist: ${pagesPath}`);
    }

    // Read JSON files directly from each folder
    const schemaFiles = readdirSync(schemasPath).filter((file: string) => extname(file).toLowerCase() === '.json');
    const pageFiles = readdirSync(pagesPath).filter((file: string) => extname(file).toLowerCase() === '.json');

    // Process schema files
    for (const file of schemaFiles) {
        const filePath = join(schemasPath, file);
        const fileName = basename(file, '.json');

        try {
            const fileContent = readFileSync(filePath, 'utf8');
            const parsedContent = JSON.parse(fileContent) as Record<string, unknown>;
            result.schemas[fileName] = parsedContent;
        } catch (error) {
            throw new Error(
                `Error processing schema file ${file}: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    // Process page files
    for (const file of pageFiles) {
        const filePath = join(pagesPath, file);
        const fileName = basename(file, '.json');

        try {
            const fileContent = readFileSync(filePath, 'utf8');
            const parsedContent = JSON.parse(fileContent) as Record<string, unknown>;
            result.pages[fileName] = parsedContent;
        } catch (error) {
            throw new Error(
                `Error processing page file ${file}: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    return result;
}

// Example usage:
// const specifications = getSpecification('./sample1_pps');
// console.log("Loaded specifications:", Object.keys(specifications));
//
// Expected result format:
// {
//   schemas: {
//     "schemaFile1": { ... parsed JSON content from /schemas/schemaFile1.json ... },
//     "schemaFile2": { ... parsed JSON content from /schemas/schemaFile2.json ... }
//   },
//   pages: {
//     "pageFile1": { ... parsed JSON content from /pages/pageFile1.json ... },
//     "pageFile2": { ... parsed JSON content from /pages/pageFile2.json ... }
//   }
// }
