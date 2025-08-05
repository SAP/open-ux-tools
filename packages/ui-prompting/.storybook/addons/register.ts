import { addons, types } from '@storybook/addons';
import { CodePreview } from './preview';

const ADDONS = [
    {
        id: 'code-preview',
        title: 'Answers preview',
        component: CodePreview
    }
];

for (const addon of ADDONS) {
    const { id, component, title } = addon;
    addons.register(id, () => {
        addons.add(id, {
            title: title,
            type: types.PANEL,
            match: ({ viewMode }) => !!(viewMode && viewMode.match(/^(story|docs)$/)),
            render: component
        });
    });
}
