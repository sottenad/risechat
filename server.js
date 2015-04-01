///var ngrok = require('ngrok');
var express = require('express');
var app = express();

var http = require('http').Server(app);
var req = require('request');
var io = require('socket.io')(http);
var path = require('path');
var mongoose = require('mongoose');
var textSearch = require('mongoose-text-search');

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

//Connect to DB and specify collection.
mongoose.connect('localhost', 'risechat');

// create our schema 
var chatSchema = mongoose.Schema({
    messageText: String,
    username: String,
    posted: Date,
    avatarUrl: String,
    channel: String
});
chatSchema.plugin(textSearch);
chatSchema.index({messageText: 'text'});
var ChatMessage = mongoose.model('ChatMessage', chatSchema);



var rooms = ['general', 'hackathon'];

//Connection to the socket.
io.sockets.on('connection', function (socket) {

    socket.on('addChannel', function (roomName) { 
        rooms.push(roomName);
        socket.emit('updateChannelList', rooms);
    });
     
    socket.on('switchRoom', function (newroom) {
        socket.leave(socket.room);
        socket.join(newroom);       
        socket.room = newroom;
        ChatMessage.find({channel:newroom}, function(err, data){
            if(err){
                //console.log(err);
            }else{
                socket.emit('updateRoom', { 'room': newroom, 'messages': data });
            }
        });
        //Every time someone joins, we want to re-fire this.
        getUsers(socket);
    });

    socket.on('search', function (term) {
        var resp = [];
        var encoded = encodeURI(term);
        ChatMessage.textSearch(term, function (err, data) {
            console.log(data);
            console.log(err);
            socket.emit('searchResults', data);
        });
        
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
    
    /*
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
    */
}

function pushNew(msg, thisroom) {
    var chatMessage = new ChatMessage({
        messageText: msg.messageText,
        username: msg.username,
        posted: new Date(),
        avatarUrl: msg.avatarUrl,
        channel: thisroom
    });
    chatMessage.save(function (err, msg) {
        console.log(msg); 
    });
}
