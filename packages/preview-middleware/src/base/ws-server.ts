import * as http from 'http';
import * as WebSocket from 'ws';
const port = 1337;

// when curl http:localhost://1337
const server = http.createServer((req: any, res: any) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('hey there');
});

const wsServer = new WebSocket.Server({ noServer: true });

export const sockets: any = [];

wsServer.on('connection', (socket: any) => {
    sockets.push(socket);

    socket.on('message', (message: any) => {
        console.log('server received:', message);
    });

    socket.on('close', () => {
        //sockets.delete(socket);
        console.log('Client disconnected');
    });
});

server.on('upgrade', (request: any, socket: any, head: any) => {
    wsServer.handleUpgrade(request, socket, head, (ws: any) => {
        wsServer.emit('connection', ws, request);
    });
});

// Now that server is running
server.listen(port, () => console.log('server runnig at', port));
