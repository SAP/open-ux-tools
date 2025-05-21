import { addons, types } from '@storybook/addons';
import { render as renderPreview } from './preview/component';
import { render as renderProject } from './project/component';

const ADDONS = [
    {
        id: 'code-preview',
        title: 'Code preview',
        render: renderPreview
    },
    {
        id: 'project-selector',
        title: 'Project path',
        render: renderProject
    }
];

for (const addon of ADDONS) {
    const { id, render, title } = addon;
    addons.register(id, () => {
        addons.add(id, {
            title: title,
            type: types.PANEL,
            match: ({ viewMode }) => !!viewMode?.match(/^(story|docs)$/),
            render: render
        });
    });
}
