import { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { LoadingState } from '../types';
import type { SystemState } from '../types';
import type { BackendSystem, SystemType } from '@sap-ux/store';
import type { IActionCalloutDetail } from '@sap-ux/ui-components';

/**
 * Custom React hook that manages the main store state and UI interactions for SAP system configuration.
 *
 * @returns An object containing system information, field setters, UI states, loading states, status objects, configuration flags, and utility functions.
 */
export function useSystemMain(): {
    systemInfo?: BackendSystem;
    systemUnSaved?: boolean;
    defaultName: string;
    setName: (name: string | undefined) => void;
    setType: (systemType: SystemType) => void;
    setAuthenticationType: (authenticationType: string | undefined) => void;
    setUrl: (url: string | undefined) => void;
    setClient: (client: string | undefined) => void;
    setUsername: (username: string) => void;
    setPassword: (password: string) => void;
    testConnectionBtnDisabled: boolean;
    saveButtonDisabled?: boolean;
    showConnectionStatus: boolean;
    showEditSystemStatus: boolean;
    isDetailsUpdated: boolean;
    isDetailsValid: boolean;
    setIsDetailsUpdated: (isUpdated: boolean) => void;
    setIsDetailsValid: (isValid: boolean) => void;
    systemState: LoadingState;
    testConnectionState?: LoadingState;
    connectionStatus?: { connected: boolean; message?: string };
    updateSystemStatus?: { message: string; updateSuccess: boolean };
    addNewSapSystem?: boolean;
    guidedAnswerLink?: IActionCalloutDetail;
    resetStatus: () => void;
    checkMandatoryFields: () => void;
    isEmpty: (str?: string) => boolean;
} {
    // Select all needed state at once
    const {
        systemInfo,
        unSaved,
        loadingState,
        testConnectionLoadingState,
        connectionStatus,
        guidedAnswerLink,
        updateSystemStatus,
        addNewSapSystem
    } = useSelector((state: SystemState) => state);

    // Combine system fields into one state object
    const [systemFields, setSystemFields] = useState({
        name: systemInfo?.name,
        systemType: systemInfo?.systemType,
        authenticationType: systemInfo?.authenticationType,
        url: systemInfo?.url,
        client: systemInfo?.client,
        username: systemInfo?.username,
        password: systemInfo?.password,
        serviceKeys: systemInfo?.serviceKeys
    });

    const defaultName = `${systemFields.url}`;

    // Memoized setters
    const setName = useCallback((name: string | undefined) => setSystemFields((fields) => ({ ...fields, name })), []);

    const setType = useCallback(
        (systemType: SystemType) => setSystemFields((fields) => ({ ...fields, systemType })),
        []
    );

    const setAuthenticationType = useCallback(
        (authenticationType: string | undefined) => setSystemFields((fields) => ({ ...fields, authenticationType })),
        []
    );

    const setUrl = useCallback((url: string | undefined) => setSystemFields((fields) => ({ ...fields, url })), []);

    const setClient = useCallback(
        (client: string | undefined) => setSystemFields((fields) => ({ ...fields, client })),
        []
    );

    const setUsername = useCallback((username: string) => setSystemFields((fields) => ({ ...fields, username })), []);

    const setPassword = useCallback((password: string) => setSystemFields((fields) => ({ ...fields, password })), []);

    // Other UI states
    const [testConnectionBtnDisabled, disableTestConnectionBtn] = useState(false);
    const [saveButtonDisabled, disableSaveButton] = useState(false);
    const [showConnectionStatus, setShowConnectionStatus] = useState(false);
    const [showEditSystemStatus, setShowEditSystemStatus] = useState(false);
    const [isDetailsUpdated, setIsDetailsUpdated] = useState(false);
    const [isDetailsValid, setIsDetailsValid] = useState(true);

    // Sync local systemFields with store changes
    useEffect(() => {
        setSystemFields({
            name: systemInfo?.name,
            systemType: systemInfo?.systemType,
            authenticationType: systemInfo?.authenticationType,
            url: systemInfo?.url,
            client: systemInfo?.client,
            username: systemInfo?.username,
            password: systemInfo?.password,
            serviceKeys: systemInfo?.serviceKeys
        });
    }, [systemInfo]);

    const resetStatus = () => {
        setShowConnectionStatus(false);
        setShowEditSystemStatus(false);
    };

    const isEmpty = (str?: string): boolean => !str || str.length === 0;

    const checkMandatoryFields = () => {
        const { url, name } = systemFields;
        if (!isEmpty(url) && !isEmpty(name) && isDetailsUpdated && isDetailsValid) {
            disableSaveButton(false);
        } else if (isEmpty(url) || isEmpty(name)) {
            disableSaveButton(true);
        }
    };

    const disableAllButtons = (disable: boolean) => {
        disableTestConnectionBtn(disable);
        disableSaveButton(disable);
    };

    useEffect(() => {
        checkMandatoryFields();
        resetStatus();
    }, [systemFields.systemType]);

    useEffect(() => {
        resetStatus();
        checkMandatoryFields();
    }, [systemFields.name, systemFields.username, systemFields.password]);

    useEffect(() => {
        if (systemFields.systemType === 'OnPrem') {
            resetStatus();
        }
        checkMandatoryFields();
    }, [systemFields.url, systemFields.client]);

    useEffect(() => {
        if (connectionStatus) {
            setShowConnectionStatus(true);
            setShowEditSystemStatus(false);
            if (connectionStatus.connected) {
                checkMandatoryFields();
                setIsDetailsUpdated(false);
            }
        }
    }, [connectionStatus]);

    useEffect(() => {
        setShowConnectionStatus(false);
        if (updateSystemStatus?.message) {
            setShowEditSystemStatus(true);
        }
    }, [updateSystemStatus]);

    useEffect(() => {
        if (isDetailsValid) {
            disableAllButtons(false);
        } else {
            disableAllButtons(true);
        }
    }, [isDetailsValid]);

    // Expose only systemInfo and other UI/setter fields
    return {
        systemInfo: systemFields as BackendSystem,
        systemUnSaved: unSaved,
        defaultName,
        setName,
        setType,
        setAuthenticationType,
        setUrl,
        setClient,
        setUsername,
        setPassword,
        testConnectionBtnDisabled,
        saveButtonDisabled,
        showConnectionStatus,
        showEditSystemStatus,
        isDetailsUpdated,
        isDetailsValid,
        setIsDetailsUpdated,
        setIsDetailsValid,
        systemState: loadingState || LoadingState.Idle,
        testConnectionState: testConnectionLoadingState,
        connectionStatus,
        updateSystemStatus,
        addNewSapSystem,
        guidedAnswerLink,
        resetStatus,
        checkMandatoryFields,
        isEmpty
    };
}
