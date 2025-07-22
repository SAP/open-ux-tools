import { addons, types } from '@storybook/addons';
import { CodePreview } from './preview/component';
import { ProjectSelector } from './project/component';

const ADDONS = [
    {
        id: 'code-preview',
        title: 'Code preview',
        component: CodePreview
    },
    {
        id: 'project-selector',
        title: 'Project path',
        component: ProjectSelector
    }
];

for (const addon of ADDONS) {
    const { id, component, title } = addon;
    addons.register(id, () => {
        addons.add(id, {
            title: title,
            type: types.PANEL,
            match: ({ viewMode }) => !!viewMode?.match(/^(story|docs)$/),
            render: component
        });
    });
}
