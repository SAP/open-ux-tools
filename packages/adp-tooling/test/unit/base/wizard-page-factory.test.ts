import { WizardPageFactory } from '../../../src/base/wizard-page-factory';

describe('WizardPageFactory', () => {
    const packageName = 'test-package';
    let factory: WizardPageFactory<'page1' | 'page2'>;

    beforeEach(() => {
        factory = new WizardPageFactory<'page1' | 'page2'>(packageName);
    });

    describe('getPageId', () => {
        it('should return the correct page id', () => {
            expect(factory.getPageId('page1')).toBe('test-package:page1');
            expect(factory.getPageId('page2')).toBe('test-package:page2');
        });
    });

    describe('create', () => {
        it('should create an IPage with correct id, name, and description', () => {
            const pageModel = {
                localId: 'page1' as const,
                name: 'Page One',
                description: 'First page'
            };
            const page = factory.create(pageModel);
            expect(page).toEqual({
                id: 'test-package:page1',
                name: 'Page One',
                description: 'First page'
            });
        });
    });

    describe('createMany', () => {
        it('should create multiple IPage objects', () => {
            const pageModels = [
                { localId: 'page1' as const, name: 'Page One', description: 'First page' },
                { localId: 'page2' as const, name: 'Page Two', description: 'Second page' }
            ];
            const pages = factory.createMany(pageModels);
            expect(pages).toEqual([
                { id: 'test-package:page1', name: 'Page One', description: 'First page' },
                { id: 'test-package:page2', name: 'Page Two', description: 'Second page' }
            ]);
        });
    });
});
