### CDS Annotation Parser Tests

Test data can be found in `test/data` folder with sub-folders `valid` and `invalid`. Each test case has its respective folder or sub-folder(s) which contains:
1. `assignment.txt` with annotation assignment source text
2. `cst.json` compact form of CST (Context Syntax Tree) for given source text
3. `ast.json` compact form of AST (Abstract Syntax Tree) for the given source text

### Writing a new test
1. open a terminal and navigate to `packages/cds-annotation-parser`
2. type `pnpm test:create <valid/folder/path/for/new/test>` in terminal. This will generate a folder or sub-folders under `test/data/valid` based on given folder path with a new file `assignment.txt`
3. adjust CDS annotation assignment source text in newly generated `assignment.txt` under given folder path
4. type `pnpm test:update <valid/folder/path/for/new/test>` in terminal. This will generate respective `cst.json` and `ast.json`
5. run test. `pnpm test`



### Tips
* You can update `cst.json` or `ast.json` by this command: `pnpm test:update valid/vocabulary-group cst` or. Replace `cst` with `ast` to update only `ast` of `vocabulary-group` test case
* Run `pnpm test:update` to generate `cst.json` and `ast.json` for all test cases
* You can skip or run only a specific test cases or add todo test case by simply providing a folder path to test case in `skip`, `only` or `todo` array variable of `parser.test.ts`. i.e to run only `/valid/vocabulary-group`, we add this folder path to `only` like this:
    ```javascript
  const only: string[] = ['/valid/vocabulary-group'];
    ```
### Note
* Please make sure that `assignment.txt` has end of line (eol) as `LF`