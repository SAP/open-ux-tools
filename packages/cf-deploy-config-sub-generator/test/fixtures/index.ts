import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __testdirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * A simple caching store for test fixtures
 *
 * @export
 * @class TestFixture
 */
export class TestFixture {
    private fileContents: { [filename: string]: string } = {};

    getContents(relativePath: string): string {
        if (!this.fileContents[relativePath]) {
            this.fileContents[relativePath] = fs.readFileSync(path.join(__testdirname, relativePath)).toString();
        }
        return this.fileContents[relativePath];
    }
}
