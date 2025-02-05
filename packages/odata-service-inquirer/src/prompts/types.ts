/**
 * Internal types for prompts
 */

import type { IValidationLink } from '@sap-devx/yeoman-ui-types';

/**
 * Result of running a prompt `validate` function, including a string message, a boolean, or a validation link for Guided Answer help link support.
 */
export type ValidationResult = string | boolean | IValidationLink;
