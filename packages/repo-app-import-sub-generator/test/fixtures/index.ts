import * as fs from 'fs';
import * as path from 'path';

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
            this.fileContents[relativePath] = fs.readFileSync(path.join(__dirname, relativePath)).toString();
        }
        return this.fileContents[relativePath];
    }
}
