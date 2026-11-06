import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { access, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { parseArgs } from 'node:util';

/**
 * Parse command line flags; every flag takes a value and the listed ones are required.
 * @param {Record<string, { required?: boolean, default?: string, multiple?: boolean }>} flags flag specification
 * @param {string} usage usage line shown when a required flag is missing
 * @returns {Record<string, string | string[]>} the parsed values
 * @example
 * const args = parseCli({ dataset: { required: true } }, 'Usage: x.mjs --dataset DIR');
 */
export function parseCli(flags, usage) {
    const options = Object.fromEntries(
        Object.entries(flags).map(([name, spec]) => [
            name,
            {
                type: 'string',
                ...(spec.multiple ? { multiple: true } : {}),
                ...(spec.default ? { default: spec.default } : {})
            }
        ])
    );
    const { values } = parseArgs({ options, strict: true });
    const missing = Object.entries(flags)
        .filter(([name, spec]) => spec.required && values[name] === undefined)
        .map(([name]) => `--${name}`);
    if (missing.length > 0) {
        throw new Error(`missing ${missing.join(', ')}\n${usage}`);
    }
    return values;
}

/**
 * Parse a number flag and refuse anything that is not finite.
 * @param {string} value the raw flag value
 * @param {string} name the flag name, for the error
 * @returns {number} the number
 */
export function numberFlag(value, name) {
    const number = Number(value);
    if (!Number.isFinite(number)) {
        throw new TypeError(`--${name} must be a number`);
    }
    return number;
}

/**
 * Read a JSON file.
 * @param {string} path file path
 * @returns {Promise<unknown>} the parsed value
 */
export async function readJson(path) {
    return JSON.parse(await readFile(path, 'utf8'));
}

/**
 * Read a JSON Lines file line by line.
 * @param {string} path file path
 * @returns {Promise<object[]>} one record per non-empty line
 */
export async function readJsonl(path) {
    const records = [];
    const lines = createInterface({ input: createReadStream(path, 'utf8'), crlfDelay: Infinity });
    let lineNumber = 0;
    for await (const line of lines) {
        lineNumber += 1;
        if (line.trim()) {
            try {
                records.push(JSON.parse(line));
            } catch (error) {
                throw new TypeError(`${path}:${lineNumber} is not valid JSON: ${error.message}`);
            }
        }
    }
    return records;
}

/**
 * Write JSON atomically (temporary file, then rename), compact or indented.
 * @param {string} path output path
 * @param {unknown} value the value
 * @param {{ indent?: number }} [options] indentation; compact when absent
 * @returns {Promise<void>}
 */
export async function writeJson(path, value, { indent } = {}) {
    const temporary = `${path}.tmp`;
    await writeFile(temporary, `${JSON.stringify(value, null, indent)}\n`, 'utf8');
    await rename(temporary, path);
}

/**
 * Write JSON Lines atomically.
 * @param {string} path output path
 * @param {unknown[]} records one value per line
 * @returns {Promise<void>}
 */
export async function writeJsonl(path, records) {
    const temporary = `${path}.tmp`;
    await writeFile(temporary, records.map((record) => `${JSON.stringify(record)}\n`).join(''), 'utf8');
    await rename(temporary, path);
}

/**
 * SHA-256 of a string or buffer.
 * @param {string | Uint8Array} value the bytes
 * @returns {string} lowercase hex digest
 */
export function sha256(value) {
    return createHash('sha256').update(value).digest('hex');
}

/**
 * SHA-256 of a file, streamed.
 * @param {string} path file path
 * @returns {Promise<string>} lowercase hex digest
 */
export async function sha256File(path) {
    const digest = createHash('sha256');
    for await (const chunk of createReadStream(path)) {
        digest.update(chunk);
    }
    return digest.digest('hex');
}

/**
 * Emit one structured log line on stderr; stdout stays free for results.
 * @param {'INFO' | 'WARNING' | 'ERROR'} level severity
 * @param {string} event event name
 * @param {Record<string, unknown>} [fields] structured context, never record values
 */
export function log(level, event, fields = {}) {
    process.stderr.write(`${JSON.stringify({ level, event, at: new Date().toISOString(), ...fields })}\n`);
}

/**
 * Path of one split of one config in a checkout of the mockgen-datasets repository, checked to exist.
 * @param {string} root dataset checkout (the directory holding `data/`)
 * @param {string} config config name, e.g. `rows_head_a`
 * @param {string} split split name, e.g. `train`
 * @returns {Promise<string>} the file path
 */
export async function datasetFile(root, config, split) {
    const path = join(root, 'data', config, `${split}.jsonl`);
    try {
        await access(path);
    } catch {
        throw new Error(
            `dataset file missing: data/${config}/${split}.jsonl under --dataset; pass a mockgen-datasets checkout`
        );
    }
    return path;
}

/**
 * Run a CLI entry point, reporting a failure as one structured error line and exit code 1.
 * @param {string} name tool name
 * @param {() => Promise<void>} main the entry point
 * @returns {Promise<void>}
 */
export async function runCli(name, main) {
    try {
        await main();
    } catch (error) {
        log('ERROR', `${name}.failed`, { message: error instanceof Error ? error.message : String(error) });
        process.exitCode = 1;
    }
}
