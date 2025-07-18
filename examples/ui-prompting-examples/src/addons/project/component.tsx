import React, { useState, memo } from 'react';
import { Form, Blockquote, Loader, AddonPanel } from '@storybook/components';
import { getApplication, getWebSocket, updateProjectPath } from '../../utils';
import type { ApplicationInformation } from './types';

getWebSocket();

const setStoredApp = (app: ApplicationInformation): void => {
    if (app.projectPath === undefined) {
        localStorage.removeItem('projectPath');
    } else {
        localStorage.setItem('projectPath', app.projectPath);
    }
    localStorage.setItem('appId', app.appId ?? '');
};

const getStoredApp = (): ApplicationInformation | null => {
    const projectPath = localStorage.getItem('projectPath');
    const appId = localStorage.getItem('appId');
    return projectPath
        ? {
              projectPath,
              appId: appId ?? ''
          }
        : null;
};

// Reload preview to apply new project path
const reloadPreview = (): void => {
    const previewFrame = document.getElementById('storybook-preview-iframe') as HTMLIFrameElement;
    previewFrame?.contentWindow?.location.reload();
};

const BlockerLoader = () => {
    return (
        <div
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                zIndex: 2,
                background: 'rgba(0, 0, 0, 0.1)'
            }}>
            <Loader />
        </div>
    );
};

export const ProjectPathForm = memo(() => {
    const [pendingApp, setPendingApp] = useState<ApplicationInformation | undefined>({
        projectPath: '',
        appId: ''
    });
    const [savedApp, setSavedApp] = useState<ApplicationInformation | undefined>({
        projectPath: '',
        appId: ''
    });
    const [message, setMessage] = useState('');
    const [busy, setBusy] = useState(false);
    const isSubmitEnabled = savedApp?.projectPath !== pendingApp?.projectPath || savedApp?.appId !== pendingApp?.appId;
    // Method to update both - pending and currently saved path
    const updateSavedApp = (app: ApplicationInformation | undefined) => {
        setPendingApp(app);
        setSavedApp(app);
    };
    // Resolve initial saved path:
    // 1. Read saved path from localStorage
    // 2. Read default proejct path
    React.useEffect(() => {
        const storedApp = getStoredApp();
        if (storedApp) {
            updateSavedApp(storedApp);
        } else {
            getApplication()
                .then((application) => {
                    updateSavedApp(application);
                })
                .catch(() => console.log('Error while getting project path'));
        }
    }, []);

    // Update pending path value during live change in input field
    const onPathInput = (event: React.FormEvent) => {
        if (message) {
            setMessage('');
        }
        const { target } = event;
        if (
            'value' in target &&
            'name' in target &&
            typeof target.value === 'string' &&
            typeof target.name === 'string'
        ) {
            const { name, value } = target;
            if (pendingApp) {
                setPendingApp({
                    ...pendingApp,
                    [name]: value
                });
            } else {
                setPendingApp(undefined);
            }
        }
    };
    // Submit project path with pending path or passed path
    const onSubmit = (_event?: React.SyntheticEvent, application: ApplicationInformation | undefined = pendingApp) => {
        setBusy(true);
        updateProjectPath(application)
            .then((payload) => {
                const { saved, application, message } = payload;
                if (saved && application) {
                    updateSavedApp(application);
                    setStoredApp(application);
                    // Reload preview to apply new project path
                    reloadPreview();
                } else if (message) {
                    setMessage(message);
                }
                setBusy(false);
            })
            .catch(() => console.log('Error while updating project path'));
    };
    // Reset project path to default mock path
    const onReset = () => {
        onSubmit(undefined, {
            projectPath: undefined,
            appId: ''
        });
    };
    // Submit form when 'Enter' key is pressed
    const onKeyPress = (event: React.KeyboardEvent) => {
        if (event.key === 'Enter' && isSubmitEnabled) {
            onSubmit();
        }
    };

    return (
        <AddonPanel active={true}>
            <div onKeyDown={onKeyPress}>
                {message && (
                    <Form.Field label=" ">
                        <Blockquote>{message}</Blockquote>
                    </Form.Field>
                )}
                <Form.Field label="Path">
                    <Form.Input
                        rev=""
                        size="100%"
                        value={pendingApp?.projectPath}
                        name="projectPath"
                        onChange={onPathInput}
                    />
                    <Form.Button onClick={onReset}>Reset to default</Form.Button>
                </Form.Field>
                <Form.Field label="App Folder(CAP only)">
                    <Form.Input rev="" size="100%" value={pendingApp?.appId} name="appId" onChange={onPathInput} />
                </Form.Field>
                <div style={{ padding: '15px 0 0 130px' }}>
                    <Form.Button
                        onClick={onSubmit}
                        disabled={isSubmitEnabled ? undefined : true}
                        title={isSubmitEnabled ? '' : 'No changes to update'}>
                        Update
                    </Form.Button>
                </div>
                {busy && <BlockerLoader />}
            </div>
        </AddonPanel>
    );
});

ProjectPathForm.displayName = 'ProjectPathForm';

export const render = (props: { active?: boolean }): React.ReactElement => {
    const { active = false } = props;
    return (
        <AddonPanel key="panel" active={active}>
            <ProjectPathForm />
        </AddonPanel>
    );
};
