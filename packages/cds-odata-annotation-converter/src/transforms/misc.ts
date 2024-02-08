import { join } from 'path';
import { pathToFileURL } from 'url';

export const toAbsoluteUriString = (root: string, relativeUri: string): string => {
    return pathToFileURL(join(root, relativeUri)).toString();
};
