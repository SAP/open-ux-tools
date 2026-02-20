import React from 'react';
import type { ReactElement } from 'react';
import { SapSystem } from './layout/SapSystem';

import '../styles/App.scss';

/**
 * React element for App.
 *
 * @returns ReactElement
 */
export default function App(): ReactElement {
    return (
        <div className="App">
            <SapSystem />
        </div>
    );
}
