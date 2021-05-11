var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const socketio = require('socket.io');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();
const server = require("http").Server(app);
const io = socketio(server);

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

const formatMessage = require('./utils/messages.js');
const { userJoin, getCurrentUser, userLeave, getRoomUsers } = require('./utils/users.js');

const botName = 'Chattroboten';

// IO CONNECTION
io.on("connection", socket => {

    // GET USER AND ROOM FROM USERS.JS
    socket.on('joinRoom', ({ username, room }) => {

        // PUSH USER TO USER-ARRAY
        const user = userJoin(socket.id, username, room);

        // JOIN ROOM
        socket.join(user.room);

        // WELCOME CURRENT USER
        // EMIT = SEND TO CURRENT USER
        socket.emit('message', formatMessage(botName, "Välkommen till chatten!"));

        // WHEN A USER CONNECT
        // BROADCAST = SEND TO ALL USERS
        socket.broadcast.to(user.room).emit('message', formatMessage(botName, `${user.username} har anslutit till chatten!`));

        // SEND ROOM AND USERS TO FRONTEND
        io.to(user.room).emit('roomUsers', {
            room: user.room,
            users: getRoomUsers(user.room)
        });
    });

    // LISTEN FOR CHAT MESSAGE
    socket.on('chatMessage', (msg) => {
        const user = getCurrentUser(socket.id);

        // SEND MESSAGE TO FRONTEND
        io.to(user.room).emit('message', formatMessage(user.username, msg));
    });

    // WHEN A USER DISCONNECT
    socket.on("disconnect", () => {

        // REMOVE USER FROM ARRAY
        const user = userLeave(socket.id);

        if (user) {
            io.to(user.room).emit('message', formatMessage(botName, `${user.username} har lämnat chatten.`));

            // SEND NEW INFO TO FRONTEND
            io.to(user.room).emit('roomUsers', {
                room: user.room,
                users: getRoomUsers(user.room)
            });
        };
    });
});

module.exports = {app: app, server: server};
