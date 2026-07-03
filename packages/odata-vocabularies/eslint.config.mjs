import base from '../../eslint.config.mjs';

export default [
    ...base,
    {
        rules: {
            "sonarjs/no-implicit-dependencies": "warn",
        }
    },
];