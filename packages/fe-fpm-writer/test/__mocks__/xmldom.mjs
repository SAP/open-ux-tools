import { createRequire } from 'module';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
// Resolve the real xmldom bypassing Jest's moduleNameMapper by using require.resolve
const xmldomPath = require.resolve('@xmldom/xmldom', {
    paths: [resolve(fileURLToPath(import.meta.url), '../../../../node_modules')]
});
const actual = require(xmldomPath);

export function DOMParser(options) {
    return new actual.DOMParser(options?.onError ? { ...options, errorHandler: options.onError } : options);
}

export const XMLSerializer = actual.XMLSerializer;
export const DOMImplementation = actual.DOMImplementation;
