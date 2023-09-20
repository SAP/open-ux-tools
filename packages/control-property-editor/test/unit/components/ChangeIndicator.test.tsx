import React from 'react';

import { render } from '../utils';
import { initI18n } from '../../../src/i18n';

import { ChangeIndicator } from '../../../src/components/ChangeIndicator';
import { mockResizeObserver } from '../../utils/utils';
import { initIcons } from '@sap-ux/ui-components';

beforeAll(() => {
    mockResizeObserver();
    initI18n();
    initIcons();
});

describe('ChangeIndicator', () => {
    test('saved changes', () => {
        const { container } = render(<ChangeIndicator id={'change-indicator'} saved={1} pending={0} />);
        expect(container.querySelector('svg')).toMatchInlineSnapshot(`
            <svg
              fill="none"
              height="8"
              id="change-indicator"
              role="img"
              viewBox="0 0 8 8"
              width="8"
              xmlns="http://www.w3.org/2000/svg"
            >
              <title>
                Modified & Saved
              </title>
              <circle
                cx="4"
                cy="4"
                fill="var(--vscode-terminal-ansiGreen)"
                r="4"
              />
            </svg>
        `);
    });

    test('pending changes', () => {
        const { container } = render(<ChangeIndicator saved={0} pending={2} />);
        expect(container.querySelector('svg')).toMatchInlineSnapshot(`
            <svg
              fill="none"
              height="8"
              role="img"
              viewBox="0 0 8 8"
              width="8"
              xmlns="http://www.w3.org/2000/svg"
            >
              <title>
                Modified & Unsaved
              </title>
              <circle
                cx="4"
                cy="4"
                r="3.5"
                stroke="var(--vscode-terminal-ansiGreen)"
              />
            </svg>
        `);
    });

    test('pending and saved changes', () => {
        const { container } = render(<ChangeIndicator saved={3} pending={2} />);
        expect(container.querySelector('svg')).toMatchInlineSnapshot(`
            <svg
              fill="none"
              height="8"
              role="img"
              viewBox="0 0 8 8"
              width="8"
              xmlns="http://www.w3.org/2000/svg"
            >
              <title>
                Saved & Unsaved
              </title>
              <circle
                cx="4"
                cy="4"
                r="3.5"
                stroke="var(--vscode-terminal-ansiGreen)"
              />
              <path
                d="M4 8a4 4 0 1 0 0-8v8Z"
                fill="var(--vscode-terminal-ansiGreen)"
              />
            </svg>
        `);
    });

    test('do not add unknown properties', () => {
        const { container } = render(
            <ChangeIndicator id={'change-indicator'} saved={1} pending={0} {...{ xyz: 'abc ' }} />
        );
        expect(container.querySelector('svg')).toMatchInlineSnapshot(`
            <svg
              fill="none"
              height="8"
              id="change-indicator"
              role="img"
              viewBox="0 0 8 8"
              width="8"
              xmlns="http://www.w3.org/2000/svg"
            >
              <title>
                Modified & Saved
              </title>
              <circle
                cx="4"
                cy="4"
                fill="var(--vscode-terminal-ansiGreen)"
                r="4"
              />
            </svg>
        `);
    });
});
