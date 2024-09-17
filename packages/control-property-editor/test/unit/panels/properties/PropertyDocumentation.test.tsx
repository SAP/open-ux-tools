import React from 'react';
import { screen } from '@testing-library/react';
import { render } from '../../utils';
import type { PropertyDocumentationProps } from '../../../../src/panels/properties/PropertyDocumentation';
import { PropertyDocumentation } from '../../../../src/panels/properties/PropertyDocumentation';
import { initI18n } from '../../../../src/i18n';

import { mockResizeObserver } from '../../../utils/utils';

describe('PropertyDoc', () => {
    beforeAll(() => {
        mockResizeObserver();
        initI18n();
    });

    test('no changes', () => {
        const props: PropertyDocumentationProps = {
            description: 'testDoc',
            title: 'Test Property',
            defaultValue: 'defaultValue',
            propertyName: 'testProperty',
            propertyType: 'testType',
            onDelete: jest.fn()
        };
        render(<PropertyDocumentation {...props} />);

        expect(screen.getByText(/property name/i)).toBeInTheDocument();
        expect(screen.getByText(/testProperty/i)).toBeInTheDocument();
        expect(screen.getByText(/property type/i)).toBeInTheDocument();
        expect(screen.getByText(/testType/i)).toBeInTheDocument();
        expect(screen.getByText(/default value/i)).toBeInTheDocument();
        expect(screen.getByText(/defaultValue/i)).toBeInTheDocument();
        expect(screen.getByText(/testDoc/i)).toBeInTheDocument();
    });

    test('pending changes', () => {
        const props: PropertyDocumentationProps = {
            description: 'testDoc',
            title: 'Test Property',
            defaultValue: 'defaultValue',
            propertyName: 'testProperty',
            propertyType: 'testType',
            onDelete: jest.fn()
        };
        render(<PropertyDocumentation {...props} />, {
            initialState: {
                selectedControl: {
                    id: 'control1'
                } as any,
                changes: {
                    stack: [],
                    controls: {
                        control1: {
                            pending: 0,
                            saved: 1,
                            properties: {
                                testProperty: {
                                    saved: 0,
                                    pending: 1,
                                    lastChange: {
                                        propertyName: 'testProperty',
                                        value: 'c value',
                                        type: 'pending',
                                        isActive: true,
                                        controlId: 'control1'
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        expect(screen.getByText(/current value/i)).toBeInTheDocument();
        expect(screen.getByText(/c value/i)).toBeInTheDocument();
    });

    test('saved changes', () => {
        const props: PropertyDocumentationProps = {
            description: 'testDoc',
            title: 'Test Property',
            defaultValue: 'defaultValue',
            propertyName: 'testProperty',
            propertyType: 'testType',
            onDelete: jest.fn()
        };
        render(<PropertyDocumentation {...props} />, {
            initialState: {
                selectedControl: {
                    id: 'control1'
                } as any,
                changes: {
                    stack: [],
                    controls: {
                        control1: {
                            pending: 0,
                            saved: 1,
                            properties: {
                                testProperty: {
                                    saved: 1,
                                    pending: 0,
                                    lastSavedChange: {
                                        propertyName: 'testProperty',
                                        value: 'old value',
                                        type: 'saved',
                                        fileName: 'file',
                                        timestamp: 123,
                                        controlId: 'control1'
                                    }
                                }
                            }
                        }
                    }
                }
            } as any
        });

        expect(screen.getByText(/Saved value/i)).toBeInTheDocument();
        expect(screen.getByText(/old value/i)).toBeInTheDocument();
        const deleteButton = screen.getByRole('button');

        deleteButton.click();

        expect(props.onDelete).toHaveBeenCalledWith('control1', 'testProperty');
    });
});
