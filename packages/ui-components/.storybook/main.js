const path = require('path');
const fs = require('fs');
const { mergeConfig } = require('vite');

const WRONG_CODE = `import { bpfrpt_proptype_WindowScroller } from "../WindowScroller.js";`;
export function reactVirtualized() {
  return {
    name: "my:react-virtualized",
    configResolved() {
      const file = require
        .resolve("react-virtualized")
        .replace(
          path.join("dist", "commonjs", "index.js"),
          path.join("dist", "es", "WindowScroller", "utils", "onScroll.js"),
        );
      const code = fs.readFileSync(file, "utf-8");
      const modified = code.replace(WRONG_CODE, "");
      fs.writeFileSync(file, modified);
    },
  }
}

module.exports = {
    stories: ['../stories/*.story.tsx'],
    addons: [
        '@storybook/addon-essentials',
        // {
        //     name: '@storybook/addon-styling',
        //     options: {
        //         sass: {
        //             // Require your Sass preprocessor here
        //             implementation: require('sass')
        //         }
        //     }
        // }
    ],
    // webpackFinal: async (config) => {
    //     config.module.rules.push({
    //         test: /\.(ts|tsx)$/,
    //         use: [
    //             {
    //                 loader: require.resolve('ts-loader'),
    //                 options: {
    //                     configFile: 'tsconfig.json',
    //                     transpileOnly: true
    //                 }
    //             }
    //         ]
    //     });
    //     config.resolve.extensions.push('.ts', '.tsx');
    //     return config;
    // },
    async viteFinal(config) {
        // Merge custom configuration into the default config
        return mergeConfig(config, {
        //   // Add dependencies to pre-optimization
        //   optimizeDeps: {
        //     include: ['storybook-dark-mode'],
        //   },
          plugins: [ reactVirtualized() ], 
        });
      },
    framework: {
        name: '@storybook/react-vite',
        options: {}
    },
    core: {
        builder: '@storybook/builder-vite', // 👈 The builder enabled here.
      },
    docs: {
        autodocs: true
    }
};
