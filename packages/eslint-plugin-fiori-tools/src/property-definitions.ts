import type { RuleFixType, RuleType } from '@eslint/core';

type Value = boolean | string | { [key: string]: any } | undefined;

export const FioriPropertyName = {
    flexEnabled: 'flexEnabled'
    // Add more properties as needed
};

export type FioriPropertyDefinition = {
    name: string;
    description: string;
    applicableToV2: boolean;
    applicableToV4: boolean;
    applicableToFreestyle: boolean;
    type: RuleType;
    message: string; // Message to display when the property is not compliant
    defaultValue: Value;
    expectedValue: Value; // If undefined, the property is expected not to be set
    minUI5Version?: string;
    possibleValues: {
        V2?: Value[];
        V4?: Value[];
        freestyle?: Value[];
    };
    manifestPaths: {
        V2?: (string | undefined)[];
        V4?: (string | undefined)[];
        freestyle?: (string | undefined)[];
    };
    documentationUrl: string;
    availableInPageEditor: boolean;
    fixable?: RuleFixType;
};

export const PROPERTY_DEFINITIONS: {
    [name: string]: FioriPropertyDefinition;
} = {
    flexEnabled: {
        name: 'Flex Enabled',
        description:
            '"flexEnabled" flag in the manifest.json indicates that your application is enabled for UI adaptation.',
        applicableToV2: true,
        applicableToV4: true,
        applicableToFreestyle: true,
        message: '"flexEnabled" should be set to true to enable UI adaptation features',
        defaultValue: true,
        expectedValue: true,
        minUI5Version: '1.56.0',
        possibleValues: {
            V2: [true, false],
            V4: [true, false],
            freestyle: [true, false]
        },
        type: 'suggestion',
        manifestPaths: {
            V2: ['sap.ui5', 'flexEnabled'],
            V4: ['sap.ui5', 'flexEnabled'],
            freestyle: ['sap.ui5', 'flexEnabled']
        },
        documentationUrl: 'https://ui5.sap.com/sdk/#/topic/f1430c0337534d469da3a56307ff76af',
        availableInPageEditor: true,
        fixable: 'code'
    }
};
