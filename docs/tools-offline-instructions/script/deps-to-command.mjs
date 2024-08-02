import { promises } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pathToGlobalModules = join(__dirname, '../info/globalModules.json');
const pathToProjectModules = join(__dirname, '../info/projectModules.json');
const pathToReadmeMd = join(__dirname, '..', 'README.md');

const regexp = new RegExp(/(?<=```shell\nnpm install --force ).*?(?= --registry=http:\/\/localhost:4873\/\n```)/);
const options = { encoding: 'utf8' };
const readFile = async (path) => promises.readFile(path, options);
const writeFile = async (path, data) => promises.writeFile(path, data, options);
const depsToString = (d) =>
    Object.keys(d)
        .map((name) => {
            if (Array.isArray(d[name])) {
                if (d[name].length === 1) {
                    return `${name}@${d[name][0]}`;
                } else {
                    return d[name].map((v) => `${(name + v).replace(/[@/^~]/g, '-')}@npm:${name}@${v}`).join(' ');
                }
            } else {
                return `${name}@${d[name]}`;
            }
        })
        .join(' ');

/**
 * Update readme file with list of dependencies from dependencies.json file
 */
async function updateReadMe() {
    try {
        const dependencies = {
            ...JSON.parse(await readFile(pathToGlobalModules)),
            ...JSON.parse(await readFile(pathToProjectModules))
        };
        const dependenciesString = depsToString(dependencies);
        console.log(`\nUpdating dependencies in '${pathToReadmeMd}' with \n\n${dependenciesString}\n\n`);
        const markdown = await readFile(pathToReadmeMd);
        const newMarkdown = markdown.replace(regexp, dependenciesString);
        await writeFile(pathToReadmeMd, newMarkdown);
        console.log(`File '${pathToReadmeMd}' successfully updated.\n`);
    } catch (error) {
        console.error(`Error while updating README.md: `, error);
    }
}

updateReadMe();
