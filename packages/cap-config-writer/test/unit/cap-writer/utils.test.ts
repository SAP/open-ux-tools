import { getLaunchText } from '../../../src';
import { t } from '../../../src/i18n';

describe('Launch Text utility function tests', () => {
    it('should generate correct launch text', () => {
        let mvnCommand = ' (```mvn spring-boot:run```)';
        let capUrl = `http://localhost:8080/project1/webapp/index.html`;
        const workspaceCapUrl = `http://localhost:4004/test.app.project1/index.html`;

        expect(getLaunchText('Java', 'project1', undefined)).toBe(
            `${t('TEXT_LAUNCH_CAP', { mvnCommand, capUrl })}`
        );
        capUrl = `http://localhost:4004/project1/webapp/index.html`;
        mvnCommand = '';

        expect(getLaunchText('Node.js', 'project1', undefined)).toBe(
            `${t('TEXT_LAUNCH_CAP', { mvnCommand, capUrl })}`
        );
        expect(getLaunchText('Node.js', 'project1', 'test.app.project1')).toBe(
            `${t('TEXT_LAUNCH_CAP', { mvnCommand, capUrl: workspaceCapUrl })}`
        );

        expect(getLaunchText('Node.js', 'project1', undefined)).toBe(
            `${t('TEXT_LAUNCH_CAP', { mvnCommand, capUrl })}`
        );
        expect(getLaunchText('Node.js', 'project1', 'test.app.project1')).toBe(
            `${t('TEXT_LAUNCH_CAP', { mvnCommand, capUrl: workspaceCapUrl })}`
        );
    });
});
