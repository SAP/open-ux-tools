import { addons, types } from '@storybook/addons';
import { render as renderPreview } from './preview';

const ADDONS = [
    {
        id: 'code-preview',
        title: 'Answers preview',
        render: renderPreview
    }
];

for (const addon of ADDONS) {
    const { id, render, title } = addon;
    addons.register(id, () => {
        addons.add(id, {
            title: title,
            type: types.PANEL,
            match: ({ viewMode }) => !!(viewMode && viewMode.match(/^(story|docs)$/)),
            render: render
        });
    });
}
