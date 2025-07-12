
import { io, Socket } from 'socket.io-client';

export let socket: Socket;

export const connect = () => {
    if (socket?.connected) return;
    
    socket = io({
        transports: ['websocket'],
    });

    socket.on('connect', () => {
        console.log('Socket connected:', socket.id);
    });

    socket.on('disconnect', () => {
        console.log('Socket disconnected');
    });
};


export const disconnect = () => {
    if(socket) {
        socket.disconnect();
    }
};
