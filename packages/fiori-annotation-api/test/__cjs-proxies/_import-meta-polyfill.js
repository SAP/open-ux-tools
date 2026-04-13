// Polyfill for import.meta.url in CJS context
export const __import_meta_url =
    typeof import.meta !== 'undefined' ? import.meta.url : require('url').pathToFileURL(__filename).href;
