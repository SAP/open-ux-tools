import { isLoopbackHost } from './browser/origin.js';

/**
 * Asserts `value` is a non-empty string; throws `message` otherwise.
 *
 * @param value The value to check.
 * @param message Error message when the assertion fails.
 * @returns The validated string.
 */
function assertNonEmptyString(value: unknown, message: string): string {
    if (typeof value !== 'string' || value.length === 0) {
        throw new Error(message);
    }
    return value;
}

/**
 * Reads `key` from `payload` and asserts it is a non-empty string. The Zod
 * schema declares `payload` as `record(string, unknown)` so the AI can pass
 * any shape; per-step required fields are validated here instead.
 *
 * @param payload The step payload, possibly undefined.
 * @param key Property name to read.
 * @returns The string value.
 */
export function requireString(payload: Record<string, unknown> | undefined, key: string): string {
    return assertNonEmptyString(payload?.[key], `payload.${key} is required and must be a non-empty string`);
}

/**
 * Asserts the top-level `appPath` is a non-empty string. Required for the
 * `start` and `restart` steps (project identity + CF session keying).
 *
 * @param appPath Value of `input.appPath`.
 * @returns The validated appPath.
 */
export function requireAppPath(appPath: string | undefined): string {
    return assertNonEmptyString(
        appPath,
        'appPath is required for this step. Pass the adaptation project root (the same appPath used to open the editor).'
    );
}

/**
 * Reads `key` from `payload` and asserts it is a plain object.
 *
 * @param payload The step payload, possibly undefined.
 * @param key Property name to read.
 * @returns The object value.
 */
export function requireObject(payload: Record<string, unknown> | undefined, key: string): Record<string, unknown> {
    const value = payload?.[key];
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        throw new Error(`payload.${key} is required and must be an object`);
    }
    return value as Record<string, unknown>;
}

/**
 * Reads `key` from `payload` and asserts it is a non-empty array of non-empty strings.
 * An empty array is rejected: a step that calls this needs at least one value, so an
 * empty array is a caller mistake that should fail fast rather than no-op.
 *
 * @param payload The step payload, possibly undefined.
 * @param key Property name to read.
 * @returns The string array value.
 */
export function requireStringArray(payload: Record<string, unknown> | undefined, key: string): string[] {
    const value = payload?.[key];
    if (
        !Array.isArray(value) ||
        value.length === 0 ||
        value.some((item) => typeof item !== 'string' || item.length === 0)
    ) {
        throw new Error(`payload.${key} is required and must be a non-empty array of non-empty strings`);
    }
    return value as string[];
}

/**
 * Asserts that `site` is a non-empty http(s) URL on a loopback host (`localhost`,
 * `127.0.0.1`, or `::1`). The adaptation editor always binds to the local loopback
 * interface, so any other host is rejected to prevent SSRF via a malicious MCP
 * client or prompt-injected URL.
 *
 * @param site Value of `input.site`.
 * @returns The validated site URL.
 */
export function requireSite(site: string | undefined): string {
    if (typeof site !== 'string' || site.length === 0) {
        throw new Error('site is required for this step. Pass the site URL returned by the "start" step.');
    }
    let url: URL;
    try {
        url = new URL(site);
    } catch {
        throw new Error(`site must be a valid URL. Received: "${site}"`);
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        throw new Error(`site must be an http:// or https:// URL. Received: "${site}"`);
    }
    if (!isLoopbackHost(url.hostname)) {
        throw new Error(`site must point to localhost, 127.0.0.1 or ::1. Received: "${url.hostname}"`);
    }
    return site;
}
