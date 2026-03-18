// Set SYSTEMDRIVE for @azure/monitor-opentelemetry-exporter which requires it at static init time
// even on non-Windows systems (applicationinsights v3 transitive dependency)
if (!process.env.SYSTEMDRIVE) {
    process.env.SYSTEMDRIVE = process.platform === 'win32' ? 'C:' : '/';
}

module.exports = async () => {
    // Global setup runs before Jest loads test environment
    if (!process.env.SYSTEMDRIVE) {
        process.env.SYSTEMDRIVE = process.platform === 'win32' ? 'C:' : '/';
    }
};
