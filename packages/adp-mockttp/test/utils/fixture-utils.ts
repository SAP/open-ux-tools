import fs from 'fs';
import path from 'path';

export function readFixture(name: string): string {
    return fs.readFileSync(path.resolve(__dirname, '..', 'fixtures', name), 'utf8');
}
