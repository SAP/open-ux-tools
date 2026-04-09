import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Locates template files relative to the dist folder.
 * This helps to locate templates when this module is bundled and the dir structure is flattened, maintaining the relative paths.
 *
 * @param relativeTemplatePath - optional, the path of the required template relative to the ./templates folder. If not specified the root templates folder is returned.
 * @returns the path of the template specified or templates root folder
 */
export function getTemplatePath(relativeTemplatePath: string = ''): string {
    return join(__dirname, '../templates', relativeTemplatePath);
}
