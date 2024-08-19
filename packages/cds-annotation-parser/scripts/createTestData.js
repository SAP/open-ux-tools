const { stat, mkdirSync, writeFileSync, closeSync, openSync } = require('fs');
const { join } = require('path');

const getFolderPath = () => {
    let folder = process.argv[2];
    if (!folder) {
        throw `Please provide unique folder path. Please pay attention to folder path convention. i.e 'folder/path/to/create'`;
    }
    return folder.split(' ').join('-');
};
const getContent = () => {
    return process.argv[3];
};
const getBase = () => join(__dirname, '..', 'test', 'data');
const getRoot = () => join(getBase(), getFolderPath());
const doesExits = (path) => {
    return new Promise((resolve) => {
        stat(path, (err) => {
            if (err) {
                resolve(false);
            }
            resolve(true);
        });
    });
};
const create = async () => {
    const content = getContent();

    const ROOT = getRoot();
    const exits = await doesExits(ROOT);
    if (exits) {
        throw `"${ROOT}" exits already. Please provide unique folder path. Please pay attention to folder path convention. i.e 'folder/path/to/create'`;
    } else {
        mkdirSync(ROOT, { recursive: true });
    }
    if (content) {
        writeFileSync(join(ROOT, 'assignment.txt'), content);
    } else {
        closeSync(openSync(join(ROOT, 'assignment.txt'), 'w'));
    }
};

create()
    .then(() => {
        const ROOT = getRoot();
        const folder = getFolderPath();
        const content = getContent();
        console.log(`
        ${
            content
                ? `* This content: "${content}" is added  to "${ROOT}/assignment.txt". If content is not correct, please adjust it`
                : `* Please adjust content in "${ROOT}/assignment.txt"`
        }
        * Please run "npm run test:update ${folder}" or "yarn test:update ${folder}" to generate "cst.json" and "ast.json"

        Note: Running "npm run test:update" or "yarn test:update" will generate "cst.json" and "ast.json" for all test cases
        `);
    })
    .catch(console.error);
