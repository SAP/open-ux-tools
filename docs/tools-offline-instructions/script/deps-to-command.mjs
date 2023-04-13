import { promises } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pathToDependenciesJson = join(__dirname, '..', 'dependencies.json');
const pathToReadmeMd = join(__dirname, '..', 'README.md');

const regexp = new RegExp(/(?<=```shell\nnpm install ).*?(?= --registry=http:\/\/localhost:4873\/\n```)/);
const options = { encoding: 'utf8' };
const readFile = async (path) => promises.readFile(path, options);
const writeFile = async (path, data) => promises.writeFile(path, data, options);
const depsToString = (d) =>
    Object.keys(d)
        .map((name) => `${name}@${d[name]}`)
        .join(' ');

/**
 * Update readme file with list of dependencies from dependencies.json file
 */
async function updateReadMe() {
    try {
        const dependencies = JSON.parse(await readFile(pathToDependenciesJson));
        const dependenciesString = depsToString(dependencies.node_modules);
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
