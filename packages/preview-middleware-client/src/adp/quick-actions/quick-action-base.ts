import { QuickActionContext } from '../../cpe/quick-actions/quick-action-definition';

import { EnablementValidator, EnablementValidatorError, EnablementValidatorResult } from './enablement-validator';

/**
 * Base class for all  quick actions.
 */
export abstract class QuickActionDefinitionBase<T extends string> {
    public get id(): string {
        return `${this.context.key}-${this.type}`;
    }

    /**
     * Quick Actions tooltip.
     */
    public get tooltip(): string | undefined {
        if (this.validationResult) {
            const validationErrors = this.validationResult.filter(
                (result): result is EnablementValidatorError => result?.type === 'error'
            );
            if (validationErrors.length > 0) {
                const error = validationErrors[0];
                return error.message;
            }
        }
        return undefined;
    }

    protected validationResult: EnablementValidatorResult[] | undefined;
    protected get isDisabled(): boolean {
        if (this.validationResult === undefined) {
            return false;
        }
        const validationErrors = this.validationResult.filter((result) => result?.type === 'error');
        return validationErrors.length > 0;
    }

    protected get textKey(): string {
        return this.defaultTextKey;
    }

    constructor(
        public readonly type: string,
        public readonly kind: T,
        protected readonly defaultTextKey: string,
        protected readonly context: QuickActionContext,
        protected readonly enablementValidators: EnablementValidator[] = []
    ) {}

    async runEnablementValidators(): Promise<void> {
        this.validationResult = await Promise.all(
            this.enablementValidators.map(async (validator) => await validator.run())
        );
    }
}
