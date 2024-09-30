# Example: UI using the prompts and fe-fpm-writer modules

This project contains UI storybook stories with exampleS with prompt ui and FPM based building blocks.

## Usage
Run the following:
```bash
pnpm storybook
```

This will open browser window with prompt fields as a questions to capture information required to generate building blocks.
The building blocks will be inserted into a new Fiori elements application in the `test-output/fe-app` folder. Look for the view xml file in the `webapp/ext` folder.
There is also option to provide custom path to project in footer undet 'Project Path' tab.
