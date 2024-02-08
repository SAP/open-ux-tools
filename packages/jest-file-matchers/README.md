# @sap-ux/jest-file-matchers

Library of jest matchers

## Installation
Npm
`npm install --save @sap-ux/jest-file-matchers`

Yarn
`yarn add @sap-ux/jest-file-matchers`

Pnpm
`pnpm add @sap-ux/jest-file-matchers`

## Configuration

There are various ways of making the matchers available in your tests.

1. Setup code in a single file `testSetup.[js|ts]`:
``` typescript
// ./testSetup.[js|ts]

// Add all the matchers
import * as matchers from '@sap-ux/jest-file-matchers';
expect.extend(matchers);

// Or just add specific matchers
import { toMatchFolder } from '@sap-ux/jest-file-matchers';
expect.extend({ toMatchFolder });
```
Add the file to your `jest` config file:
```json
"jest": {
  "setupFilesAfterEnv": ["./testSetup.js"]
}
```

2. Call setup code from `@sap-ux/jest-file-matchers`:
```json
"jest": {
  "setupFilesAfterEnv": ["@sap-ux/jest-file-matchers/dist/setup"]
}
```
This will make all the matchers available in all your tests.

3. Extend the `expect` object only in the files where the matchers are needed:
```typescript
import { toMatchFolder } from  '@sap/ux-jest-matcher';

expect.extend({ toMatchFolder });
```

Option 2 is the easiest.

## Usage
### `toMatchFolder()`
Import the matchers to get the type definitions loaded:
```typescript
import '@sap-ux/jest-file-matchers';

expect(folderA).toMatchFolder(snapShotFolderA);
```

This will perform snapshot tests of the files under `folderA`. `snapShotFolderA` contains snapshots of the files as _seperate_ files.
Both folders need to be full paths, to be unambiguous.

Use with `.not`:
```typescript
import '@sap-ux/jest-file-matchers';

expect(folderA).not.toMatchFolder(snapShotFolderA);
```

`toMatchFolder` accepts optional include/exclude filters. These filters are basic [`minimatch`](https://github.com/isaacs/minimatch) glob patterns. Exclude filters have a higher precedence over include filters, i.e if a file path matches both include and exclude glob patterns, it will be _excluded_.

Example:
```typescript
//  Only include Javascript files
expect(folderA).not.toMatchFolder(snapShotFolderA, { include: ['**/.js'] });

//  Only include Javascript files & HTML, exclude setup.js
expect(folderA).not.toMatchFolder(snapShotFolderA, { include: ['**/.js', '**.htm?(l)'], exclude: ['**/setup.js'] });

//  Ignore .DS_Store files
expect(folderA).not.toMatchFolder(snapShotFolderA, { exclude: ['**/.DS_Store'] });

//  Ignore everything in the dist folder
expect(folderA).not.toMatchFolder(snapShotFolderA, { exclude: ['**/dist/**'] });
```

`toMatchFolder` uses two other matchers internally. They are also available to be used on their own:
* `toContainAllFilesIn`: asserts that the received folder contains all the files the expected folder (matches on filenames only)
* `toMatchFilesIn`: asserts that the file contents match the contents of files with the same relative path wrt the snapshot folder.

These two matchers have an identical function signature.

#### Update snapshots

Pass `-u` or `--update` to update the snapshot folder. Please use this with care and verify the contents are actually correct.

## Keywords
SAP Fiori Tools