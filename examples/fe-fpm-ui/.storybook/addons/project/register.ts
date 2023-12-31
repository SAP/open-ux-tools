import { addons, types } from '@storybook/addons';
import { render } from './component';

const ADDON_ID = 'project-selector';

addons.register(ADDON_ID, () => {
    addons.add(ADDON_ID, {
        title: 'Code preview',
        type: types.PANEL,
        match: ({ viewMode }) => !!(viewMode && viewMode.match(/^(story|docs)$/)),
        render: render
    });
});
