import * as React from 'react';
import '@testing-library/jest-dom';
import type { ConnectionStatus, UpdateSystemStatus } from '@sap-ux/sap-systems-ext-types';
import type { IActionCalloutDetail } from '@sap-ux/ui-components';
import { render, fireEvent } from '@testing-library/react';
import { screen } from '@testing-library/dom';
import { SystemStatus } from '../../../../../../src/components/layout/main/status/SystemStatus';
import { actions } from '../../../../../../src/state';

describe('<SystemStaus />', () => {
    it('Test Connection status (v2 services only)', () => {
        const connectionStatus: ConnectionStatus = {
            catalogResults: {
                v2Request: {
                    count: 2450
                },
                v4Request: {
                    count: 0
                }
            },
            showOutputChannelLink: false,
            connected: true
        };
        const openOutputChannelSpy = jest.spyOn(actions, 'openOutputChannel');

        render(<SystemStatus connectionStatus={connectionStatus} showConnectionStatus={true} />);

        expect(screen.getByText('The OData V2 catalog call returned 2450 services.')).toBeInTheDocument();
        expect(screen.getByText('The OData V4 catalog service is not available.')).toBeInTheDocument();

        const showOutputChannelBtn = screen.getByText('OUTPUT tab.');

        showOutputChannelBtn.click();
        expect(openOutputChannelSpy).toHaveBeenCalledTimes(1);
    });

    it('Test Connection status (failure)', () => {
        const connectionStatus: ConnectionStatus = {
            message: 'System could not connect',
            connected: false,
            showOutputChannelLink: false
        };

        render(<SystemStatus connectionStatus={connectionStatus} showConnectionStatus={true} />);

        expect(screen.getByText('System could not connect')).toBeInTheDocument();
    });

    it('Test Connection status with Guided Answer link (failure with Guided Answers link)', () => {
        const connectionStatus: ConnectionStatus = {
            message: 'System could not connect',
            connected: false,
            showOutputChannelLink: false
        };

        const gaLink: IActionCalloutDetail = {
            linkText: 'link text',
            subText: 'sub text',
            url: 'http://some.help.url'
        };

        render(
            <SystemStatus connectionStatus={connectionStatus} showConnectionStatus={true} guidedAnswerLink={gaLink} />
        );

        expect(screen.getByText('System could not connect')).toBeInTheDocument();

        // Ensure that passed values are rendered, no need to test internal rendering details of UIActionCallout here.
        expect(screen.getByText(gaLink.linkText)).toBeInTheDocument();
        expect(screen.getByText(gaLink.subText)).toBeInTheDocument();

        const gaLinkHTMLElement = screen.getByText(gaLink.linkText);
        expect(gaLinkHTMLElement).toHaveAttribute('href', 'http://some.help.url');
    });

    it('Test Save status (successful)', () => {
        const updateSystemStatus: UpdateSystemStatus['payload'] = {
            message: 'System saved',
            updateSuccess: true
        };

        render(<SystemStatus updateSystemStatus={updateSystemStatus} showUpdateSystemStatus={true} />);

        expect(screen.getByText('System saved')).toBeInTheDocument();
    });

    it('Test Save status (failure)', () => {
        const updateSystemStatus: UpdateSystemStatus['payload'] = {
            message: 'Unable to save system',
            updateSuccess: true
        };

        render(<SystemStatus updateSystemStatus={updateSystemStatus} showUpdateSystemStatus={true} />);

        expect(screen.getByText('Unable to save system')).toBeInTheDocument();
    });

    it('Test Save status with existing system link', () => {
        const updateSystemStatus: UpdateSystemStatus['payload'] = {
            message: 'Failed to create the connection information: Connection already exists',
            updateSuccess: false,
            existingSystem: {
                name: 'Existing System',
                url: 'https://existing.system.com',
                client: '100'
            }
        };

        const openExistingSystemSpy = jest.spyOn(actions, 'openExistingSystem');

        render(<SystemStatus updateSystemStatus={updateSystemStatus} showUpdateSystemStatus={true} />);

        const systemLink = screen.getByText('Existing System');
        expect(systemLink).toBeInTheDocument();

        // The label contains the prefix, link, and suffix as sibling nodes
        const label = systemLink.closest('label');
        expect(label?.textContent).toContain('A connection [');
        expect(label?.textContent).toContain('Existing System');
        expect(label?.textContent).toContain('] already exists with the same URL and Client.');

        fireEvent.click(systemLink);
        expect(openExistingSystemSpy).toHaveBeenCalledWith('https://existing.system.com', '100');
    });

    it('Test Save status without existing system renders plain message', () => {
        const updateSystemStatus: UpdateSystemStatus['payload'] = {
            message: 'Failed to create the connection information: Some other error',
            updateSuccess: false
        };

        render(<SystemStatus updateSystemStatus={updateSystemStatus} showUpdateSystemStatus={true} />);

        expect(screen.getByText('Failed to create the connection information: Some other error')).toBeInTheDocument();
    });
});
