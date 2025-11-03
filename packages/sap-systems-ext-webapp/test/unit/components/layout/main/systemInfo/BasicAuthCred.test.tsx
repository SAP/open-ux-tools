import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BasicAuthCreds } from '../../../../../../src/components/layout/main/systemInfo/BasicAuthCreds';

describe('<BasicAuthCred />', () => {
    it('Test inputs', () => {
        const setUsername = jest.fn();
        const setPassword = jest.fn();
        const setIsDetailsUpdated = jest.fn();
        const eventUser = { target: { value: 'input-value' } };
        render(
            <BasicAuthCreds
                username="user"
                password="pass"
                setUsername={setUsername}
                setPassword={setPassword}
                setIsDetailsUpdated={setIsDetailsUpdated}
            />
        );

        const usernameInput = screen.getByDisplayValue('user');
        const passwordInput = screen.getByDisplayValue('pass');

        fireEvent.change(usernameInput, eventUser);
        fireEvent.change(passwordInput, eventUser);

        expect(setIsDetailsUpdated).toHaveBeenCalled();
        expect(setUsername).toHaveBeenCalledWith('input-value');
        expect(setPassword).toHaveBeenCalledWith('input-value');

        expect(
            screen.getByText(
                "Passwords are stored in your operating system's credential manager and are protected by its security policies."
            )
        ).toBeInTheDocument();
        expect(screen.getByTitle('alert-outline')).toBeInTheDocument();
        expect(screen.getByText('Learn more...')).toBeInTheDocument();
    });
});
