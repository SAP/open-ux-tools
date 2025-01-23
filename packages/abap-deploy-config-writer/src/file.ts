import { join } from 'path';
import fg from 'fast-glob';
import { platform } from 'os';
import { FileName, type Package, getReuseLibs } from '@sap-ux/project-access';
import { UI5_CLI_LIB, UI5_CLI_MIN_VERSION, UI5_REPO_IGNORE, UI5_REPO_TEXT_FILES } from './constants';
import { coerce, satisfies } from 'semver';
import type { Editor } from 'mem-fs-editor';

/**
 * Adds a new UI5 dependency to the package.json.
 * No longer required for `@ui5/cli` v3 and above.
 *
 * @param fs - the memfs editor instance
 * @param basePath - the base path
 * @param depName - the dependency name
 */
export function addUi5Dependency(fs: Editor, basePath: string, depName: string): void {
    const filePath = join(basePath, FileName.Package);
    const packageJson = (fs.readJSON(filePath) ?? {}) as Package;

    const ui5CliVersion = coerce(packageJson?.devDependencies?.[UI5_CLI_LIB]);
    if (ui5CliVersion && satisfies(ui5CliVersion, `>=${UI5_CLI_MIN_VERSION}`)) {
        // https://sap.github.io/ui5-tooling/v3/updates/migrate-v3/#changes-to-dependency-configuration
        return;
    }

    packageJson.ui5 = packageJson.ui5 ?? {};
    packageJson.ui5.dependencies = packageJson.ui5.dependencies ?? [];

    if (!packageJson.ui5.dependencies.includes(depName)) {
        packageJson.ui5.dependencies.push(depName);
    }
    fs.writeJSON(filePath, packageJson);
}

/**
 * Returns the path of the library file.
 *
 * @param basePath - base path of the library
 * @returns the path of the library file
 */
export async function getLibraryPath(basePath: string): Promise<string> {
    return (
        await getReuseLibs([
            {
                projectRoot: basePath
            }
        ])
    )[0]?.path;
}

/**
 * Writes the UI5 repository file.
 *
 * @param fs - the memfs editor instance
 * @param basePath - the base path
 * @param ui5RepositoryFile - the UI5 repository file
 * @param addContent - the content to be added
 */
export const writeUi5RepositoryFile = (
    fs: Editor,
    basePath: string,
    ui5RepositoryFile: string,
    addContent: string
): void => {
    const filePath = join(basePath, ui5RepositoryFile);
    let content: string;
    if (fs.exists(filePath)) {
        content = fs.read(filePath);
        if (!content.includes(addContent)) {
            content = `${content}\n${addContent}`;
        }
    } else {
        content = addContent;
    }
    fs.write(filePath, content);
};

/**
 * Returns the typescript file paths.
 *
 * @param typescriptPattern - the pattern to search for typescript files
 * @returns the typescript file paths
 */
async function getTypescriptFilePaths(typescriptPattern: string): Promise<string[]> {
    const normalisedPath = platform() === 'win32' ? typescriptPattern.replace(/\\/g, '/') : typescriptPattern;
    const typeScriptFilesPaths: string[] = await fg(normalisedPath);
    return typeScriptFilesPaths;
}

/**
 * Writes the UI5 repository files if typescript files are found.
 *
 * @param fs - the memfs editor instance
 * @param path - the path where the file will be written
 */
export async function writeUi5RepositoryFiles(fs: Editor, path: string): Promise<void> {
    const typeScriptFilesPaths = await getTypescriptFilePaths(join(path, '/**/*.ts'));
    if (typeScriptFilesPaths?.length > 0) {
        writeUi5RepositoryFile(fs, path, UI5_REPO_TEXT_FILES, '^.*.ts$');
    }
}

/**
 * Writes the UI5 repository ignore file if typescript files are found.
 *
 * @param fs - the memfs editor instance
 * @param path - the path where the file will be written
 */
export async function writeUi5RepositoryIgnore(fs: Editor, path: string): Promise<void> {
    const typeScriptFilesPaths = await getTypescriptFilePaths(join(path, '/**/*.ts'));
    if (typeScriptFilesPaths?.length > 0) {
        writeUi5RepositoryFile(fs, path, UI5_REPO_IGNORE, '^.*.ts$\n^.*.ts.map$');
    }
}
