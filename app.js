/*jslint node:true*/
'use strict';

var express = require('express'),
    app = express(),
    http = require('http'),
    path = require('path'),
    socket_io = require('socket.io'),
    server,
    io,
    chatters = {},
    typers = [];

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hjs');

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', function (req, res) {
    res.render('index', {
        title: 'Express Chat'
    });
});

app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.end(err.message);
});

server = http.createServer(app).listen(8080);

io = socket_io.listen(server);

io.on('connection', function (socket) {
    var name;
    
    socket.on('login', function (data, callback) {
        data = data.trim();
        
        if (chatters[data] || data.length === 0) {
            callback(false);
            return;
        }
        
        name = data;
        chatters[name] = socket;
        socket.broadcast.emit('info', {name: name, joined: true});
        io.sockets.emit('chatters', Object.keys(chatters));
        callback(true);
    });
    
    socket.on('message', function (message, callback) {
        var index,
            to;
        
        message = message.trim();
        
        console.log(message);
        if (message.indexOf('@') === 0) {
            index = message.indexOf(' ');
            to = message.substring(1, index);
            message = message.substr(index + 1);
            if (index < 0) {
                callback('No message');
                return;
            } else if (!chatters[to]) {
                callback(to + ' is not a valid user');
                return;
            } else if (to === name) {
                callback('You cant message yourself');
                return;
            }
            chatters[to].emit('privatemessage', {name: name, msg: message});
        } else {
            io.sockets.emit('message', {name: name, msg: message});
        }
        callback(); // any reason to do this?
    });
    
    socket.on('typing', function (data) {
        var index;
        
        if (data) {
            typers.push(name);
        } else {
            index = typers.indexOf(name);
            typers.splice(index, 1);
        }
        socket.broadcast.emit('typing', typers);
    });
    
    socket.on('disconnect', function () {
        var index = typers.indexOf(name);
        if (index >= 0) {
            typers.splice(index, 1);
            socket.broadcast.emit('typing', typers);
        }
        
        delete chatters[name];

        socket.broadcast.emit('info', {name: name, joined: false});
        io.sockets.emit('chatters', Object.keys(chatters));
    });
});
