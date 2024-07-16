export interface PageLabel {
    name: string;
    description: string;
}

export function getUIPageLabels(isCFEnv: boolean): PageLabel[] {
    if (!isCFEnv) {
        return [
            {
                name: 'Adaptation Project - Basic Information',
                description:
                    'You are about to create a new App Variant. App Variant inherits the properties of the source application. The changes that you make will reflect only in the app variant and not in the source application.'
            },
            { name: 'Adaptation Project - Configuration', description: 'Adaptation Project - Configuration' }
        ];
    }

    return [
        { name: 'Login to Cloud Foundry', description: 'Provide credentials.' },
        { name: 'Project path', description: 'Provide path to MTA project.' },
        {
            name: 'Adaptation Project - Basic Information',
            description:
                'You are about to create a new App Variant. App Variant inherits the properties of the source application. The changes that you make will reflect only in the app variant and not in the source application.'
        },
        { name: 'Application Details', description: 'Setup application details.' }
    ];
}
