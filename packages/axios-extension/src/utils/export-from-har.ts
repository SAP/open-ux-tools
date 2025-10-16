/**
 * har-to-map.ts
 *
 * Usage:
 *   npx ts-node har-to-map.ts [path/to/file.har]
 *
 * Produces: har-map.json in the current folder.
 *
 * Map format:
 * {
 *   "http://example.com/path?query=1": {
 *     "method": "GET",
 *     "body": {...} // parsed JSON if JSON, otherwise string
 *   },
 *   ...
 * }
 */

import * as fs from 'fs';
import type { WriteStream } from 'fs';

interface HarEntry {
    request: {
        method: string;
        url: string;
    };
    response: {
        content?: {
            mimeType?: string;
            text?: string;
            encoding?: string;
        };
    };
}

interface HarFile {
    log?: {
        entries?: HarEntry[];
    };
}

interface ResponseMapValue {
    method: string;
    body: unknown;
}

type ResponseMap = Record<string, ResponseMapValue>;

function safeParseJson(text: string): any {
    try {
        return JSON.parse(text);
    } catch {
        return text;
    }
}

function decodeIfBase64(text: string, encoding?: string): string {
    if (!text) {
        return '';
    }
    if (encoding && encoding.toLowerCase() === 'base64') {
        return Buffer.from(text, 'base64').toString('utf8');
    }
    return text;
}

function getResponseBody(entry: HarEntry): any {
    const content = entry.response?.content;
    if (!content?.text) {
        return '';
    }
    const decoded = decodeIfBase64(content.text, content.encoding);
    return safeParseJson(decoded);
}

export function getResponseMapFromHar(harPath: string): ResponseMap {
    if (!fs.existsSync(harPath)) {
        throw new Error(`HAR file not found: ${harPath}`);
    }

    const raw = fs.readFileSync(harPath, 'utf8');
    let har: HarFile;

    let entries;
    try {
        har = JSON.parse(raw);
    } catch (err) {
        const entryRegex = /{"startedDateTime":.*?"response":\{.*?\}\s*}/gs;
        const matches = raw.match(entryRegex);
        entries = [];
        if (matches) {
            for (const match of matches) {
                try {
                    const entry = JSON.parse(match);
                    entries.push(entry);
                } catch {
                    // skip broken entries
                }
            }
        }
    }

    if (!entries) {
        entries = har.log?.entries ?? [];
    }
    const map: ResponseMap = {};
    let skipped = 0;

    for (const entry of entries) {
        const url = entry.request?.url;
        if (!url) {
            skipped++;
            continue;
        }
        const method = entry.request?.method || 'GET';
        const body = getResponseBody(entry);
        map[url] = { method, body };
    }

    return map;
}
