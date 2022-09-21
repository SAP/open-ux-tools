import { ZipFile } from 'yazl';
import { readdirSync, readFile, statSync } from 'fs';
import { join, relative } from 'path';
import { CliOptions } from '../types';
import { createBuffer } from '../base/archive';

function createArchiveFromPath(path: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        readFile(path, (err, data) => {
            if (err) {
                reject(err);
            } else {
                resolve(data);
            }
        });
    });
}

function getFileNames(path: string): string[] {
    const names: string[] = [];

    const files = readdirSync(path);
    for (const file of files) {
        const filePath = join(path, file);
        if (statSync(filePath).isDirectory()) {
            names.push(...getFileNames(filePath));
        } else {
            names.push(filePath);
        }
    }
    return names;
}

function createArchiveFromFolder(path: string): Promise<Buffer> {
    const files = getFileNames(path);
    const zip = new ZipFile();
    for (const file of files) {
        console.log(file);
        zip.addFile(file, relative(path, file));
    }
    return createBuffer(zip);
}

export async function createArchive(options: CliOptions): Promise<Buffer> {
    if (options.archivePath) {
        return createArchiveFromPath(options.archivePath);
    } else {
        return createArchiveFromFolder(options.distFolder ?? join(process.cwd(), 'dist'));
    }
}
