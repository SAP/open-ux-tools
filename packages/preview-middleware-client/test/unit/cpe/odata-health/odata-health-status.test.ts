import { ODataDownStatus } from 'open/ux/preview/client/cpe/odata-health/odata-health-status';

describe('ODataDownStatus', () => {
    const serviceUrl = 'http://localhost:8080/service';

    it('should format error message automatically on construction', () => {
        // Arrange
        const reason = new Error('Connection timeout');

        // Act
        const status = new ODataDownStatus(serviceUrl, reason);

        // Assert
        expect(status.errorMessage).toBe('Connection timeout');
    });

    it('should format string reasons correctly', () => {
        // Arrange
        const reason = 'Service is temporarily unavailable';

        // Act
        const status = new ODataDownStatus(serviceUrl, reason);

        // Assert
        expect(status.errorMessage).toBe('Service is temporarily unavailable');
    });

    it('should format object reasons as JSON', () => {
        // Arrange
        const reason = {
            status: 500,
            message: 'Internal Server Error',
            details: 'Database connection lost'
        };

        // Act
        const status = new ODataDownStatus(serviceUrl, reason);

        // Assert
        expect(status.errorMessage).toBe(JSON.stringify(reason));
    });

    it('should handle objects which are NOT JSON serializable', () => {
        // Arrange
        const reason = new Date('2023-01-01T00:00:00.000Z');

        // Act
        const status = new ODataDownStatus(serviceUrl, reason);

        // Assert
        expect(status.errorMessage).toBe('"2023-01-01T00:00:00.000Z"');
    });
});
