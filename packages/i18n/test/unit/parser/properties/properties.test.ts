import { getAllNormalizeFolderPath, getAst, getBase, getInput, deserialize, serialize, getToken } from '../../helper';
import { FileExtension } from '../../helper/types';
import { parse } from '../../../../src/parser';
import { FileFormat } from '../../../../src/parser/types';

const testParser = async (testCasePath: string): Promise<void> => {
    const text = await getInput(testCasePath, FileExtension.properties);
    const { ast, tokens } = parse(text, FileFormat.properties);
    // check tokens
    const tokenSavedContent = await getToken(testCasePath);
    expect(deserialize(serialize(tokens))).toStrictEqual(tokenSavedContent);
    // check AST
    const astSavedContent = await getAst(testCasePath);
    expect(deserialize(serialize(ast))).toStrictEqual(astSavedContent);
};
describe('properties file', () => {
    const allTests = getAllNormalizeFolderPath(FileExtension.properties, getBase(['properties']));
    /**
     * Include folder name e.g '/properties/key-value/equal' to skip it
     */
    const skip: string[] = [];
    const todo: string[] = [];
    /**
     * Include folder name e.g '/properties/key-value/equal' to only execute it
     */
    const only: string[] = [];
    for (const t of allTests) {
        if (skip.includes(t)) {
            test.skip(`${t}`, () => {
                expect(false).toBeTruthy();
            });
            continue;
        }
        if (todo.includes(t)) {
            test.todo(`${t}`);
            continue;
        }
        if (only.includes(t)) {
            const cb = async () => {
                await testParser(t);
            };
            test.only(`${t}`, cb); //NOSONAR
            continue;
        }
        test(`${t}`, async () => {
            await testParser(t);
        });
    }
});
