
import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server } from 'socket.io';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const port = process.env.PORT || 9002;

interface WaitingUser {
  id: string;
  interests: string;
}

let waitingPool: WaitingUser[] = [];
const rooms: Record<string, { users: string[] }> = {};
const userToRoom: Record<string, string> = {};

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(httpServer);

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on('findPartner', ({ interests }: { interests: string }) => {
      console.log(`Socket ${socket.id} is finding a partner with interests: ${interests}`);
      
      const userInterests = interests.split(',').map(i => i.trim()).filter(Boolean);

      const partner = waitingPool.find(user => {
        if (user.id === socket.id) return false;
        if (userInterests.length === 0) return true; // If requester has no interests, match with anyone
        
        const partnerInterests = user.interests.split(',').map(i => i.trim()).filter(Boolean);
        if (partnerInterests.length === 0) return true; // If waiting user has no interests, match

        return userInterests.some(interest => partnerInterests.includes(interest));
      });

      if (partner) {
        waitingPool = waitingPool.filter(user => user.id !== partner.id);
        
        const roomId = `room_${socket.id}_${partner.id}`;
        rooms[roomId] = { users: [socket.id, partner.id] };
        userToRoom[socket.id] = roomId;
        userToRoom[partner.id] = roomId;

        const partnerSocket = io.sockets.sockets.get(partner.id);
        
        console.log(`Partner found: ${partner.id}. Creating room: ${roomId}`);

        socket.join(roomId);
        partnerSocket?.join(roomId);

        // Notify both users they are connected, designating an initiator
        socket.emit('partnerFound', { roomId, interests: partner.interests, isInitiator: true });
        partnerSocket?.emit('partnerFound', { roomId, interests: interests, isInitiator: false });


      } else {
        waitingPool.push({ id: socket.id, interests });
        console.log(`No partner found. Added ${socket.id} to waiting pool.`);
      }
    });

    socket.on('cancelSearch', () => {
        waitingPool = waitingPool.filter(user => user.id !== socket.id);
        console.log(`Socket ${socket.id} cancelled search.`);
    });
    
    socket.on('signal', (data) => {
        const roomId = userToRoom[socket.id];
        if(roomId){
            // Relay signal to the other user in the room
            const otherUser = rooms[roomId]?.users.find(id => id !== socket.id);
            if (otherUser) {
                io.to(otherUser).emit('signal', data);
            }
        }
    });

    socket.on('sendMessage', (message) => {
        const roomId = userToRoom[socket.id];
        if(roomId){
            socket.to(roomId).emit('message', message);
        }
    });

    const leaveRoom = () => {
        const roomId = userToRoom[socket.id];
        if (roomId && rooms[roomId]) {
            console.log(`Socket ${socket.id} is disconnecting from room ${roomId}`);
            
            socket.to(roomId).emit('partnerDisconnected');

            const roomUsers = rooms[roomId].users;
            roomUsers.forEach(userId => {
                delete userToRoom[userId];
                const userSocket = io.sockets.sockets.get(userId);
                userSocket?.leave(roomId);
            });
            delete rooms[roomId];
        } else {
             // If user was in waiting pool, remove them
            waitingPool = waitingPool.filter(user => user.id !== socket.id);
        }
    }
    
    socket.on('disconnecting', leaveRoom);
    socket.on('manualDisconnect', leaveRoom);

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  httpServer
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://localhost:${port}`);
    });
});
