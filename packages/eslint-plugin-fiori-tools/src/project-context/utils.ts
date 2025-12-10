/**
 * Normalizes a URL by replacing backslashes with forward slashes and removing leading slashes.
 *
 * @param url - The URL to normalize.
 * @returns The normalized URL.
 */
export function uniformUrl(url: string): string {
    return url
        .replace(/\\/g, '/')
        .replace(/\/\//g, '/')
        .replace(/(?:^\/)/g, '');
}
