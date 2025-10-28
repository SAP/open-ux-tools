import type { RuleFixType, RuleType } from '@eslint/core';

type Value = boolean | string | { [key: string]: any } | undefined;

export const FioriPropertyName = {
    flexEnabled: 'flexEnabled'
    // Add more properties as needed
};

type FioriPropertyDefinition = {
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
        V2?: string;
        V4?: string;
        freestyle?: string;
    };
    documentationUrl: string;
    availableInPageEditor: boolean;
    fixable?: RuleFixType;
};

const PROPERTY_DEFINITIONS: {
    [name in keyof typeof FioriPropertyName]: FioriPropertyDefinition;
} = {
    flexEnabled: {
        name: 'Flex Enabled',
        description: 'Enables UI adaptation and key user adaptation features',
        applicableToV2: true,
        applicableToV4: true,
        applicableToFreestyle: true,
        message: 'flexEnabled must be true',
        defaultValue: true,
        expectedValue: true,
        minUI5Version: '1.56.0',
        possibleValues: {
            V2: [true, false],
            V4: [true, false],
            freestyle: [true, false]
        },
        type: 'problem',
        manifestPaths: {
            V2: '["sap.ui5"].flexEnabled',
            V4: '["sap.ui5"].flexEnabled',
            freestyle: '["sap.ui5"].flexEnabled'
        },
        documentationUrl: 'https://ui5.sap.com/sdk/#/topic/ccd45ba3f0b446a0901b2c9d42b8ad53',
        availableInPageEditor: true,
        fixable: 'code'
    }
};

export { PROPERTY_DEFINITIONS };
export type { FioriPropertyDefinition };
