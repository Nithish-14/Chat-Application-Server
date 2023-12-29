const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const app = express();
const PORT = 5000;

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: '*'
    }
});

app.use(express.json());
app.use(cors());

const users = {};
const rooms = {};
const admins = {};
const messages = {};
 
const getAllUsers = (roomId) => {
    const userInRooms = [];

    Object.keys(users).map(user => {
        if (users[user].room === roomId && !userInRooms.includes(users[user].name)) {
            userInRooms.push(users[user].name);
        }
    })

    return userInRooms;
}

io.on('connection', (socket) => {
    console.log('a user connected ' + socket.id);

    socket.on('disconnect', () => {
        console.log(`a user disconnected ` + socket.id);

        let roomid = users[socket.id].room;

        const otherUsers1 = rooms[roomid];

        console.log('otherUsers1', otherUsers1)

        if (otherUsers1) {
            Object.keys(rooms).map(roomId => {
                rooms[roomId] = rooms[roomId].filter(x => x !== socket.id);
            })
    
            delete users[socket.id];
    
            Object.keys(rooms).map(roomId => {
                if (rooms[roomId].length === 0) {
                    delete rooms[roomId];
                    delete admins[roomId];
                    delete messages[roomId];
                }
            })
    
            const allUsers = getAllUsers(roomid);
            
            console.log(allUsers);
    
            otherUsers1.map(otherUser => {
                io.to(otherUser).emit('users', {users: allUsers});
            })
        }
    });

    socket.on('create', (params, callback) => {
        const {name, roomId} = params;

        users[socket.id] = {room: roomId, name: name.trim()};
        
        if (rooms[roomId]) {
            return callback({error: 'room already exists'});
        }


        rooms[roomId] = [];

        admins[roomId] = {name: name.trim(), socketId: socket.id};

        messages[roomId] = [];

        console.log('admins', admins);

        rooms[roomId].push(socket.id);

        let allUsers = getAllUsers(roomId);

        socket.emit('users', {users: allUsers});

        console.log('create - users', users)
        console.log('create - rooms', rooms)

        return callback();
    });

    socket.on('join', (params, callback) => {
        const {name, roomId} = params;

        users[socket.id] = {room: roomId, name: name.trim()};

        if (!rooms[roomId]) {
            return callback({error: `room doesn't exist`});
        }
        rooms[roomId].push(socket.id);


        console.log('join - users', users)
        console.log('join - rooms', rooms)

        let allUsers = getAllUsers(roomId);

        const otherUsers2 = rooms[roomId];

        otherUsers2.map(otherUser => {
            io.to(otherUser).emit('users', {users: allUsers});
        })

        messages[roomId].map(each => socket.emit('message', each));

        return callback();
    });

    socket.on('sendMessage', (params, callback) => {
        const {name, roomId, message} = params;
        let isAdmin = false;

        const otherUsers3 = rooms[roomId];

        if (socket.id === admins[roomId].socketId) {
            isAdmin = true;
        }

        messages[roomId].push({author: name.trim(), message, admin: isAdmin});
        
        otherUsers3.map(otherUser => {
            io.to(otherUser).emit('message', {author: name.trim(), message, admin: isAdmin});
        });

        return callback();
    })
})


server.listen(process.env.PORT || PORT, () => {
    console.log(`Server listening at port ${PORT}`)
})