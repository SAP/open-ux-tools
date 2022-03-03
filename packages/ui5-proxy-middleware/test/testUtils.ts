export function stopUI5Server(serverResponse: any): Promise<void> {
    return new Promise((resolve, reject) => {
        serverResponse.close((error: any) => {
            if (error) {
                reject(error);
            } else {
                console.log('Server closing');
                resolve();
            }
        });
    });
}

export function stopMockServer(server: any): Promise<void> {
    return new Promise((resolve, reject) => {
        server.stop(() => {
            resolve();
        });
    });
}
