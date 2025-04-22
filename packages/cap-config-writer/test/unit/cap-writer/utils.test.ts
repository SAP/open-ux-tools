import { getAppLaunchText } from '../../../src';
import { t } from '../../../src/i18n';

describe('Launch Text utility function tests', () => {
    it('should generate correct launch text', () => {
        let mvnCommand = ' (```mvn spring-boot:run```)';
        let capUrl = `http://localhost:8080/project1/webapp/index.html`;
        const workspaceCapUrl = `http://localhost:4004/test.app.project1/index.html`;

        expect(getAppLaunchText('Java', 'project1', undefined)).toBe(`${t('launchCapText', { mvnCommand, capUrl })}`);
        capUrl = `http://localhost:4004/project1/webapp/index.html`;
        mvnCommand = '';

        expect(getAppLaunchText('Node.js', 'project1', undefined)).toBe(
            `${t('launchCapText', { mvnCommand, capUrl })}`
        );
        expect(getAppLaunchText('Node.js', 'project1', 'test.app.project1')).toBe(
            `${t('launchCapText', { mvnCommand, capUrl: workspaceCapUrl })}`
        );
    });
});
