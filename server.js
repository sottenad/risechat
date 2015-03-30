///var ngrok = require('ngrok');
var express = require('express');
var app = express();

var http = require('http').Server(app);
var req = require('request');
var io = require('socket.io')(http);
var path = require('path');

//Configure static asset routes
app.use("/img", express.static(__dirname + "/img"));
app.use("/css", express.static(__dirname + "/css"));
app.use("/js", express.static(__dirname + "/js"));
app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname + '/index.html'));
    console.log('going to index');
});

http.listen(3000, function () {
    console.log('listening on *:3000');
});

/*
var rooms = ['general', 'hackathon'];

//Connection to the socket.
io.sockets.on('connection', function (socket) {

    socket.on('addChannel', function (roomName) {
        rooms.push(roomName);
        socket.emit('updateChannelList', rooms);
    });
     
    socket.on('switchRoom', function (newroom) {
        console.log('switchRoom: ' + newroom)
        socket.leave(socket.room);
        socket.join(newroom);       
        socket.room = newroom;

        var resp;
        req.get({
            'uri': 'http://bhpcourse.bluerooster.com/services/messages.asmx/GetMessages?max=30&cn='+newroom ,
            'json':true,
            'headers': {}
        }, function (e, r, body) {
            if (!e && r.statusCode == 200) {
                //console.log(body);
                resp = body;
            } else {
                console.log("Response error:" +  e + body);
                resp = [];
            }
            //Now pass back the room with the prepopulated messages (or none in an error)
            socket.emit('updateRoom', { 'room': newroom, 'messages': resp });
        });

        //Every time someone joins, we want to re-fire this.
        getUsers(socket);
    });

    socket.on('search', function (term) {
        var resp = [];
        var encoded = encodeURI(term);
        req.get({
            'uri': 'http://bhpcourse.bluerooster.com/services/messages.asmx/GetMessages?max=10&mt=' + encoded,
            'json': true,
            'headers': {}
        }, function (e, r, body) {
            if (!e && r.statusCode == 200) {
                //console.log(body);
                resp = body; 
            } else {
                console.log("Response error:" + e + body);
            }
            //Now pass back the room with the prepopulated messages (or none in an error)
            socket.emit('searchResults', resp);
        });
    });

    io.emit('userCount', io.engine.clientsCount);
    io.emit('updateChannelList', rooms);
    

    socket.on('newMessage', function (msg) {
        pushNew(msg, socket.room);
        io.sockets.in(socket.room).emit('newMessage', msg);
    });

    socket.on('disconnect', function () {
        io.emit('userCount', io.engine.clientsCount);
        socket.leave(socket.room);
    });

 
});






function getUsers(socket) {
    req.get({
        'uri': 'http://bhpcourse.bluerooster.com/services/users.asmx/Getusers',
        'json': true,
        'headers': {}
    }, function (e, r, body) {
        if (!e && r.statusCode == 200) {
            //console.log(body);
            resp = body;
        } else {
            console.log("Response error:" + e + body);
        }
        socket.emit('getUsers', resp);
    });
}

function pushNew(msg, thisroom) {
    req.post({
        'uri': 'http://bhpcourse.bluerooster.com/services/messages.asmx/AddMessage?mt=' + msg.MessageText + '&mf=' + msg.MessageFrom + '&cn=' + thisroom + '&avatarurl=' + msg.AvatarUrl,
        'dataType': 'json',
        'headers': {}
    }, function (e, r, body) {
        console.log("Response error:" + e + body);
    });
}
*/