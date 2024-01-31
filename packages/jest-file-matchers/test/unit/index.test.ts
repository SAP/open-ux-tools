import { join } from 'path';
import fs from 'fs';
import { toMatchFile } from '../../src/matchers/toMatchFileSnapshot';

expect.extend({ toMatchFile });

it('matches content of file on disk with specified filename', () => {
    expect(`# this is a test`).toMatchFile(join(__dirname, '..', '__fixtures__', 'output.md'));
});

it('matches content of file on disk without filename', () => {
    expect(`# this is a another test`).toMatchFile();
});

it('matches binary content of file on disk', () => {
    expect(fs.readFileSync(join(__dirname, 'minimal.pdf'), 'binary')).toMatchFile();
});

it('works with .not', () => {
    expect(`# this is a nice test`).not.toMatchFile();
});

it('works with .not for binary files', () => {
    expect(fs.readFileSync(join(__dirname, 'minimal.pdf'), 'binary')).not.toMatchFile();
});
