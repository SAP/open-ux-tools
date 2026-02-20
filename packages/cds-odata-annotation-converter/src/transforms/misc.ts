import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export const toAbsoluteUriString = (root: string, relativeUri: string): string => {
    return pathToFileURL(join(root, relativeUri)).toString();
};
