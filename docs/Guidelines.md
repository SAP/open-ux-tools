# Development Conventions and Guidelines

## Folder and package structure
Modules are located in folder [./packages/](./packages/) in this repository. Folder names are module names without scope, e.g. module `@scope/my-awesome-module` is located in folder `packages/my-awesome-module`. We might consider grouping of modules in future, in this case we will revisit folder naming guideline.

## TypeScript Coding Guidelines
We enforce code style rules using [ESLint](https://eslint.org). Execute `pnpm lint` to check your code for style issues.  
You may also find an ESLint integration for your favorite IDE [here](https://eslint.org/docs/user-guide/integrations).

You can fix auto-fixable problems by running:

```shell
pnpm lint:fix
```
## Testing
You can run all the tests by running:
```
pnpm test
```

Please make sure you add or modify tests for the code you are contributing.

We use [`jest`](https://jestjs.io/docs/getting-started) for our tests. Please look at their documentation for help.

Keep the following in mind when writing tests:
* Test code should be simple and straightforward
* Keep the scope of the tests focused. Breaking tests then indicate the problem area directly
* Test behavior and not implementation. Do not write tests for implementation details that should be hidden from callers
* Test the public interface for all possible inputs
  - Test that correct values are returned
  - Test that correct side-effects are carried out
  - When calling other code that has side-effects, assert that correct parameters are passed in and the number of invocations are correct
  - When calling other code that has no side-effects, mock the result values. Don't write tests for them, they belong elsewhere
* Tests should be in the form of given/when/then. Example:
```typescript
describe('Fiori elements templates'), () => {
    it('generate V2 LROP files correctly', async () => {
        const v2LropOutput = join(outputDir, 'v2-lrop');

        // Given that I'm generating a Fiori elements application
        // When I generate by passing in options for V2 List Report Object Page
        const fsEditor = await generate(v2LropOutput, v2LropTestData);

        // Files are correctly generated
        expect((fsEditor as any).dump(v2LropOutput)).toMatchSnapshot();
    });
});
```
(The comments above are only there for illustration).

* If writing tests is hard, it could be an indication of a design that needs simplification
* If too many objects need to be mocked, it could be an indication of too much coupling between objects/functions
* Preferably write tests first, when it makes sense. This is a judgement call
* We use jest snapshots to validate the generated files. Please follow the documentation here: https://jestjs.io/docs/snapshot-testing

## UI Component testing
[react-testing-library](https://testing-library.com/docs/react-testing-library/intro) should be used for UI component testing. 
Older components used [Enzyme](https://enzymejs.github.io/enzyme/), but should no longer as it does not support React 17+.
[TBI #833](https://github.com/SAP/open-ux-tools/issues/833) has been created to migrate existing tests to react-testing-library.


## Internationalization (i18n)
Messages and texts that are visible to the consumer and required to interact with or use the module should be translatable. This includes user dialogs, button texts, questions, labels, messages. 

This does not include texts like technical log messages, tracing information, or exception texts that are not shown as message to the consumer.
## Git Guidelines

We adhere to the [Conventional Commits](https://conventionalcommits.org) specification.

### Commit Message Style
The commit message consists of three parts:
- header
- body (optional)
- footer (optional)

#### Commit Header
The commit header is the first line of the commit message. It consists of three parts: type, scope and description.

##### Commit Type
- It must be one of the following:
    + `fix` - a bug fix (note: this will indicate a release)
    + `feat` - a new feature (note: this will indicate a release)
    + `docs` - documentation only changes
    + `style` - changes that do not affect the meaning of the code
    + `refactor` - a code change that neither fixes a bug nor adds a feature
    + `perf` - a code change that improves performance
    + `test` - adding missing tests
    + `chore` - changes to the build process or auxiliary tools and libraries such as documentation generation
    + `revert` - revert to a commit
    + `WIP` - work in progress

##### Commit Scope (optional)
- It points to a specific component which is affected by the change. For example, ui5-button, ui5-card and ui5-table.

##### Commit Description
- Use the **imperative present tense**. Instead of "I added feature xy" or "Adding tests for" use "Add feature xy" or "Add tests for".
- It should be no more than **100 characters** long.


#### Commit Body (optional)
After the commit header, there should be an empty line followed by the optional commit body.
- Describe the intention and reasoning of the change.

#### Commit Footer (optional)
After the optional commit body, there should be an empty line followed by the optional footer.
- If the change introduces a breaking change, it should start with **BREAKING CHANGE:** followed by a description of the change.
    + `BREAKING CHANGE: remove support for UI5 version 1.38`
- If the change fixes an issue reported on GitHub, add the following line to the commit message:
    + `Fixes #<issueNumber>` (e.g. `Fixes #42`)

#### Example
```
fix(templates/fiori-elements): correct app descriptor version

The app descriptor version should be calculated based on the minimal supported UI5 version.

Fixes #42
```

## Pull Requests

- Fix one issue per PR and keep PRs as small as possible. It may be slightly more work, but it is much easier to understand and review a single clear fix. Focused PRs also give consumers of a module more control over which fixes and features are available in each published version.

## Versioning
To establish and increase versions for modules in this repository, we follow [Semantic Versioning (semver)](https://semver.org/). In essence, this means:

> Given a version number MAJOR.MINOR.PATCH, increment the:
> 1. MAJOR version when you make incompatible API changes,
> 1. MINOR version when you add functionality in a backwards compatible manner, and
> 1. PATCH version when you make backwards compatible bug fixes.
>
> https://semver.org/#summary
