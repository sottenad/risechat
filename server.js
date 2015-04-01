///var ngrok = require('ngrok');
var express = require('express');
var app = express();

var http = require('http').Server(app);
var req = require('request');
var io = require('socket.io')(http);
var path = require('path');
var mongoose = require('mongoose'); 
var textSearch = require('mongoose-text-search');


mongoose.connect('mongodb://localhost/risechat');

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function (callback) {
  console.log('im connected to the db');
});

var chatSchema = mongoose.Schema({
    posted: Date,
    messageText: String,
    channel: String,
    avatarUrl: String,
    username: String
});
chatSchema.plugin(textSearch);
chatSchema.index({messageText:'text'});

var ChatMessage = mongoose.model('ChatMessage', chatSchema);
chatSchema.set('autoIndex', false);




//Configure static asset routes
app.use("/img", express.static(__dirname + "/img"));
app.use("/css", express.static(__dirname + "/css"));
app.use("/js", express.static(__dirname + "/js"));
app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname + '/index.html'));
    console.log('going to index');
});


var port = process.env.port || 3000;

http.listen(port, function () {
    console.log('listening on *:' + port );
});


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

        ChatMessage.find({channel: newroom}, function(err, msgs){
            //Now pass back the room with the prepopulated messages (or none in an error)
            console.log(msgs);
            socket.emit('updateRoom', { 'room': newroom, 'messages': msgs });
        });

        //Every time someone joins, we want to re-fire this.
        getUsers(socket);
    });

    socket.on('search', function (term) {
        var resp = [];
        var encoded = encodeURI(term);
        ChatMessage.textSearch(term, function(err, data){
            if(data.results.length >0){
                console.log(data.results);
                socket.emit('searchResults', data.results)
            }
        })
        
        /*
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
        */
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
    console.log(msg);
    var newMsg = new ChatMessage({
        posted: new Date(),
        username: msg.username,
        messageText: msg.messageText,
        avatarUrl: msg.avatarUrl,
        channel: thisroom
    });
    newMsg.save(function (err, newMessage) {
        if (err) {
          return console.error(err);
        }else{
            console.log(newMessage);
          console.log('message saved');
        }
    });
}
