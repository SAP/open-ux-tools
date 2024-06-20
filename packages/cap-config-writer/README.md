# @sap-ux/cap-config-writer

Adds or removes configuration to a SAP CAP projects.

## Installation
Npm
`npm install --save @sap-ux/cap-config-writer`

Yarn
`yarn add @sap-ux/cap-config-writer`

Pnpm
`pnpm add @sap-ux/cap-config-writer`

## Usage
```Typescript
import { enableCdsUi5Plugin } from '@sap-ux/cap-config-writer';

const fs = await enableCdsUi5Plugin('path/to/cap-project');

fs.commit();
```

## API

### updatePomXml
This utility function updates the pom.xml file for Java-based CAP projects. The function reads the contents of the pom.xml file specified by pomPath, parses it, and searches for the spring-boot-maven-plugin configuration. If found, it adds certain workspace elements to it and writes back the updated pom.xml.

```ts
import { updatePomXml } from '@sap-ux/cap-config-writer';

// Usage example
const fsMock: Editor = {}; // mem-fs file editor
const pomPath: string = 'path/to/pom.xml';
const logger: Logger = {}; // logger instance from @sap-ux/logger

updatePomXml(fsMock, pomPath, logger);
```
### updateTsConfig
The function constructs the path to the tsconfig.json file based on the provided appRoot. If the file exists, it reads its contents and checks if the typeRoots property is defined in the compilerOptions. The function extends the tsconfig.json file with the modified compilerOptions.

```ts
import { updateTsConfig } from '@sap-ux/cap-config-writer';

// Usage example
const fsMock: Editor = {}; // mem-fs file editor
const appRoot: string = 'path/to/your/app'; // The root directory of the application

updateTsConfig(fsMock, appRoot);
```

### updateStaticLocationsInApplicationYaml
The function reads the contents of the application YAML file specified by applicationYamlPath, parses it, and checks if the static resource locations are already defined. If not, it adds the custom paths specified by capCustomPathsApp to the web.resources.static-locations property.

```ts
import { updateStaticLocationsInApplicationYaml } from '@sap-ux/cap-config-writer';

// Usage example
const fsMock: Editor = {}; // mem-fs file editor
const applicationYamlPath: string = 'path/to/application.yaml';
const capCustomPathsApp: string = 'path/to/static/resources'; // Custom paths for CAP application
const logger: Logger = {}; // logger instance from @sap-ux/logger

await updateStaticLocationsInApplicationYaml(fsMock, applicationYamlPath, capCustomPathsApp, logger);
```

### updateRootPackageJson
Updates the package.json file of a CAP project app based on project requirements such as enableNPMWorkspaces

```ts
import { updateRootPackageJson } from '@sap-ux/cap-config-writer';

// Usage example
const fsMock: Editor = {}; // mem-fs file editor
const projectName: string = 'your-project-name';
const sapux: boolean = true; // Whether to add the app name to the sapux array
const capService: CapService = {}; // CAP service instance
const appId: string = 'your-app-id';
const log: Logger = {}; //// mem-fs file editor
const enableNPMWorkspaces: boolean = true; // npm workspaces (optional)

await updateRootPackageJson(fsMock, projectName, sapux, capService, appId, log, enableNPMWorkspaces);
```

### updateAppPackageJsonCAP
The function constructs the path to the package.json file based on the provided appRoot. It then reads the contents of the package.json file and removes the sapux property, the int-test script, and any scripts starting with 'start' that are not required for the app.

```ts
import { updateAppPackageJson } from '@sap-ux/cap-config-writer';

// Usage example
const fsMock: Editor = {}; // mem-fs file editor
const appRoot: string = 'path/to/your/app'; // The root directory of the application

updateAppPackageJson(fsMock, appRoot);
```

## Keywords
SAP Fiori elements
SAP CAP
SAP CAP writer
SAP UI5
