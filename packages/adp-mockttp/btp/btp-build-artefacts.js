const fs = require('fs');
const path = require('path');

const PKG_JSON_TEMPLATE = {
    main: 'index.js',
    files: [],
    scripts: {
        'start:record': 'node index.js --start --record',
        start: 'node index.js --start'
    }
};
const WORKSPACE_VERSION = 'workspace:*';

const DIST_FOLDER_NAME = 'dist';
const PKG_JSON_NAME = 'package.json';
const CF_IGNORE_NAME = '.cfignore';
const MANIFEST_NAME = 'manifest.yaml';

const UTF_ENCODING = 'utf-8';

const rootPath = process.cwd();
const distPath = path.join(rootPath, DIST_FOLDER_NAME);
const pkgPath = path.join(rootPath, PKG_JSON_NAME);
const cfignorePath = path.join(rootPath, CF_IGNORE_NAME);
const manifestPath = path.join(rootPath, MANIFEST_NAME);

if (!fs.existsSync(manifestPath)) {
    throw new Error('Should create manifest.yaml.');
}

copyFileToDistFolder(cfignorePath);
copyFileToDistFolder(manifestPath);
createPackageJsonFile();

function copyFileToDistFolder(filePath) {
    const fileName = path.basename(filePath);
    const targetFilePath = path.join(distPath, fileName);
    fs.copyFileSync(filePath, targetFilePath);
}

function createPackageJsonFile() {
    const { name, version, description, license, dependencies, devDependencies, engines } = getJsonFileContent(pkgPath);
    const targetPkgJson = {
        ...PKG_JSON_TEMPLATE,
        name,
        version,
        description,
        license,
        dependencies: normalizeDependencies(dependencies),
        devDependencies: normalizeDependencies(devDependencies),
        engines
    };
    writeJsonFile(targetPkgJson, distPath);
}

function getJsonFileContent(filePath) {
    return JSON.parse(fs.readFileSync(filePath, UTF_ENCODING));
}

function writeJsonFile(json, folderPath) {
    const pkgPath = path.join(folderPath, PKG_JSON_NAME);
    fs.writeFileSync(pkgPath, JSON.stringify(json, null, 2), UTF_ENCODING);
}

function normalizeDependencies(dependencies) {
    return Object.fromEntries(
        Object.entries(dependencies).map(([packageName, version]) => [
            packageName,
            version === WORKSPACE_VERSION ? getWorkspacePackageVersion(packageName) : version
        ])
    );
}

function getWorkspacePackageVersion(packageName) {
    const pkgJsonPath = require.resolve(path.join(packageName, PKG_JSON_NAME));
    const pkgJson = getJsonFileContent(pkgJsonPath);
    return pkgJson.version;
}
