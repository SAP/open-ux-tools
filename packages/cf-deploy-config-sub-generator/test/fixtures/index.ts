import * as fs from 'node:fs';
import * as path from 'node:path';
const __testdirname = import.meta.dirname;

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
