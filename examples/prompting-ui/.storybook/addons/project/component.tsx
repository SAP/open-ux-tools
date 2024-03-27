import React, { useState, memo } from 'react';
import { Form, Blockquote, Loader, AddonPanel } from '@storybook/components';
import { getProjectPath, getWebSocket, updateProjectPath } from '../../../stories/utils';

getWebSocket();

const setStoredPath = (path: string) => {
    localStorage.setItem('projectPath', path);
};

const getStoredPath = (): string | null => {
    const path = localStorage.getItem('projectPath');
    return path;
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
    const [pendingPath, setPendingPath] = useState('');
    const [savedPath, setSavedPath] = useState('');
    const [message, setMessage] = useState('');
    const [busy, setBusy] = useState(false);
    const isSubmitEnabled = savedPath !== pendingPath;
    // Method to update both - pending and currently saved path
    const updateSavedPath = (path: string) => {
        setPendingPath(path);
        setSavedPath(path);
    };
    // Resolve initial saved path:
    // 1. Read saved path from localStorage
    // 2. Read default proejct path
    React.useEffect(() => {
        const storedPath = getStoredPath();
        if (storedPath) {
            updateSavedPath(storedPath);
        } else {
            getProjectPath().then((projectPath) => {
                updateSavedPath(projectPath);
            });
        }
    }, []);

    // Update pending path value during live change in input field
    const onPathInput = (event: React.FormEvent) => {
        if (message) {
            setMessage('');
        }
        if ('value' in event.target && typeof event.target.value === 'string') {
            setPendingPath(event.target.value);
        }
    };
    // Submit project path with pending path or passed path
    const onSubmit = (_event?: React.MouseEventHandler, submitPath = pendingPath) => {
        console.log('Submit!');
        setBusy(true);
        updateProjectPath(submitPath).then((payload) => {
            const { saved, path, message } = payload;
            if (saved && path) {
                updateSavedPath(path);
                setStoredPath(path);
                // Reload preview to apply new project path
                reloadPreview();
            } else if (message) {
                setMessage(message);
            }
            setBusy(false);
        });
    };
    // Reset project path to default mock path
    const onReset = () => {
        onSubmit(undefined, '');
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
                    <Form.Input rev="" size="100%" value={pendingPath} onChange={onPathInput} />
                    <Form.Button onClick={onReset}>Reset to default</Form.Button>
                </Form.Field>
                <div style={{ padding: '15px 0 0 130px' }}>
                    <Form.Button
                        onClick={onSubmit}
                        disabled={isSubmitEnabled ? undefined : 'true'}
                        title={isSubmitEnabled ? '' : 'No changes to update'}>
                        Update
                    </Form.Button>
                </div>
                {busy && <BlockerLoader />}
            </div>
        </AddonPanel>
    );
});

export const render = (props: { active?: boolean }): React.ReactElement => {
    const { active = false } = props;
    return <AddonPanel key="panel" active={active}>
        <ProjectPathForm />
    </AddonPanel>
}
