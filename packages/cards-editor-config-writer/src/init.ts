#!/usr/bin/env node

import { enableCardEditor } from '.';

enableCardEditor(process.cwd())
    .then((fs) => {
        fs.commit(() => console.log('Done'));
    })
    .catch((err) => {
        console.error(err);
    });
