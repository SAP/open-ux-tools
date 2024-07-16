import { readdirSync } from 'fs';

export function getProjectNames(path: string): string[] {
    return readdirSync(path, { withFileTypes: true })
        .filter((dirent) => !dirent.isFile() && /^app[.]variant[0-9]{1,3}$/.test(dirent.name))
        .map((dirent) => dirent.name)
        .sort()
        .reverse();
}
