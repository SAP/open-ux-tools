/**
 * Takes the Visual Studio Code extension API which was exposed on the sandbox's
 * global object and uses it to create a virtual mock. This replaces vscode
 * module imports with the vscode extension instance from the test runner's
 * environment.
 */
jest.mock('vscode', () => (global as any).vscode, { virtual: true }); // eslint-disable-line @typescript-eslint/no-explicit-any
