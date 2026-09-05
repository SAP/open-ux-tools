import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { generateMockserverConfig } from '@sap-ux/mockserver-config-writer';
import { parseDocument } from 'yaml';

const START_MOCK_LAUNCHER_PREFIX = 'mockserver-data-generator start -- ';

function hasUnsupportedShellSyntax(command) {
    let quote;
    let escaped = false;
    for (let index = 0; index < command.length; index += 1) {
        const character = command[index];
        if (escaped) {
            escaped = false;
            continue;
        }
        if (quote === "'") {
            if (character === "'") quote = undefined;
            continue;
        }
        if (character === '\\') {
            escaped = true;
            continue;
        }
        if (quote === '"') {
            if (character === '"') {
                quote = undefined;
            } else if (character === '`' || (character === '$' && command[index + 1] === '(')) {
                return true;
            }
            continue;
        }
        if (character === "'" || character === '"') {
            quote = character;
        } else if (
            ['&', '|', ';', '<', '>', '`', '\n', '\r'].includes(character) ||
            (character === '$' && command[index + 1] === '(')
        ) {
            return true;
        }
    }
    return quote !== undefined || escaped;
}

/**
 * Prefix a generated simple Fiori command with the package launcher.
 *
 * @param {string} script existing `start-mock` script
 * @returns {string} idempotently wrapped script
 */
export function wrapStartMockScript(script) {
    const original = script.startsWith(START_MOCK_LAUNCHER_PREFIX)
        ? script.slice(START_MOCK_LAUNCHER_PREFIX.length)
        : script;
    if (!/^fiori[ \t]+run(?:[ \t]|$)/u.test(original) || hasUnsupportedShellSyntax(original)) {
        throw new Error('start-mock must be a simple fiori run command before MockGen can wrap it');
    }
    return script.startsWith(START_MOCK_LAUNCHER_PREFIX) ? script : `${START_MOCK_LAUNCHER_PREFIX}${script}`;
}

/**
 * Configure the existing standard mockserver through its public config writer,
 * then add the development-only MockGen dependency and provider block locally.
 * Shared configuration packages do not need MockGen-specific changes.
 *
 * @param {object} options configuration options
 * @param {string} options.appRoot application root
 * @param {string} options.webappPath application webapp directory
 * @param {string} options.generatorSpec application-local generator tarball specification
 * @param {{manifestPath: string, cacheDirectory: string, offline: true}} [options.model] learned-model inputs
 * @returns {Promise<void>}
 */
export async function configureFioriApplication({ appRoot, webappPath, generatorSpec, model }) {
    const editor = await generateMockserverConfig(appRoot, {
        webappPath
    });
    await new Promise((resolve, reject) => {
        editor.commit((error) => {
            if (error) {
                reject(error);
            } else {
                resolve();
            }
        });
    });

    const packageJsonPath = join(appRoot, 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    const startMock = packageJson.scripts?.['start-mock'];
    if (typeof startMock !== 'string') {
        throw new Error('The standard mockserver configuration did not create a start-mock script');
    }
    packageJson.scripts['start-mock'] = wrapStartMockScript(startMock);
    packageJson.devDependencies = {
        ...packageJson.devDependencies,
        '@sap-ux/mockserver-data-generator': generatorSpec
    };
    writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 4)}\n`);

    const ui5MockYamlPath = join(appRoot, 'ui5-mock.yaml');
    const document = parseDocument(readFileSync(ui5MockYamlPath, 'utf8'));
    if (document.errors.length > 0) {
        throw new Error(`Generated ui5-mock.yaml is invalid: ${document.errors[0].message}`);
    }
    const configuration = document.toJS();
    const middlewares = configuration?.server?.customMiddleware;
    const mockserverIndexes = Array.isArray(middlewares)
        ? middlewares.flatMap((middleware, index) => (middleware?.name === 'sap-fe-mockserver' ? [index] : []))
        : [];
    if (mockserverIndexes.length !== 1) {
        throw new Error(`Expected exactly one sap-fe-mockserver, found ${mockserverIndexes.length}`);
    }
    document.setIn(['server', 'customMiddleware', mockserverIndexes[0], 'configuration', 'mockDataGenerator'], {
        name: '@sap-ux/mockserver-data-generator/fe-mockserver',
        options: {
            mode: 'auto',
            seed: 42,
            rowsPerEntity: 10,
            ...(model
                ? {
                      modelManifestPath: model.manifestPath,
                      modelCacheDirectory: model.cacheDirectory,
                      modelOffline: true
                  }
                : {})
        }
    });
    writeFileSync(ui5MockYamlPath, String(document));
}
