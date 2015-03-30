var risechat = risechat || {}


/* =============================================== */
//UI stuff
$(function () {

    //Precompile templates
    risechat.messageSource = $("#messageTemplate").html();
    risechat.messageTemplate = Handlebars.compile(risechat.messageSource);

    risechat.searchSource = $("#searchTemplate").html();
    risechat.searchTemplate = Handlebars.compile(risechat.searchSource);

    risechat.directorySource = $("#directoryTemplate").html();
    risechat.directoryTemplate = Handlebars.compile(risechat.directorySource);

    //Change searchbox styling
    $('#searchBtn').on('click', function () {
        $('#search').addClass('active');
    });
    $('#searchCloseBtn').on('click', function () {
        $('#search').removeClass('active');
        $('#searchTerm').val('');
        $('#searchResults').empty();
    });
    $('#searchTerm').enterKey(function () {
        var searchTerm = $(this).val();
        socket.emit('search', searchTerm);
    });

    $('body').on('click', '.directoryItem', function (e) {
        console.log('on');
        $('#search').addClass('active');
        var searchTerm = $(e.target).text().trim();
        $('#searchTerm').val(searchTerm)
        socket.emit('search', searchTerm);
    });

    //Prepopulate username if entered
    $('#username_modal').on('show.bs.modal', function (e) {
        if (window.localStorage.getItem("username") != null) {
            $('#username').val(window.localStorage.getItem("username"));
        }
    });


    $('#addChannelBtn').on('click', function () {
        $('#channel_modal').modal({ show: true });
    });
    $('body').on('click', '#createChannel', function () {
        console.log('on')
        var channelName = $('#channelNameInput').val().toLowerCase().trim();
        console.log(channelName)
        socket.emit('addChannel', channelName);
        $('#channelNameInput').val('')
        $('#channel_modal').modal('hide');
    });

    //Initial Check for localstorage
    if (window.localStorage.getItem("username") === null) {
        $('#username_modal').modal({
            'show': true,
            'backdrop': 'static',
            'keyboard': false
        })
    }

    //Check for user image in localstorage
    if (window.localStorage.getItem("avatarurl") === null) {
        $.getJSON('http://uifaces.com/api/v1/random', function (d) {
            window.localStorage.setItem('avatarurl', d.image_urls.normal);
            risechat.avatarurl = d.image_urls.normal;
            $('#userProfileImage').attr('src', risechat.avatarurl);
        });
    } else {
        risechat.avatarurl = window.localStorage.getItem("avatarurl");
        $('#userProfileImage').attr('src', risechat.avatarurl)
    }

    $('#editUser').on('click', function (e) {
        $('#username_modal').modal('show');
    });

    $('body').on('click', '#setUsername', function (e) {
        var username = $('#username').val()
        if (username.length > 0) {
            window.localStorage.setItem("username", username);
            $('#username_modal').modal('hide');
        }
    });

    //INitial room
    socket.emit('switchRoom', 'general');   

    $('body').on('click', '.change-room', function (e) {
        $('#messages').empty().html('<div class="loading"><i class="fa fa-refresh fa-spin"></i></div>');
        socket.emit('switchRoom', $(this).attr('data-room-id'));
    })
});


/* =============================================== */
//Socket Config
var socket = io();
$('form').submit(function () {
    var messageBox = $('#m');
    var messageTxt = messageBox.val();

    // faking unicode 
    // smiley
    messageTxt = messageTxt.replace(":)", "\ud83d\ude04");
    messageTxt = messageTxt.replace(":-)", "\ud83d\ude04");

    //frowny
    messageTxt = messageTxt.replace(":-(", "\ud83d\ude2d");
    messageTxt = messageTxt.replace(":(", "\ud83d\ude2d");

    //Sunglasses
    messageTxt = messageTxt.replace("8-)", "\ud83d\ude0e");
    messageTxt = messageTxt.replace("8)", "\ud83d\ude0e");

    if (messageTxt)
    var smiley = "\ud83d\ude04";
    //messageTxt += smiley;
    if (messageTxt.trim().length > 0) {
        messageTxt = minEmoji(messageTxt );
        socket.emit('newMessage',
            {
                'MessageText': replaceURLWithHTMLLinks(messageTxt),
                'MessageFrom': window.localStorage.getItem("username"),
                'AvatarUrl':  window.localStorage.getItem("avatarurl")
            }
        );
        messageBox.val('');
    } else {
        alert('Type something before sending');
    }
    return false;
});


/* =============================================== */
//Socket Events
socket.on('userCount', function (user_count) {
    $('#userCount').html(user_count)
});

socket.on('newMessage', function (msg) {
    var now = new Date();
    var timestamp = moment(now).format('h:mm a');
    console.log(msg);
    var context = [{
        'Posted': timestamp,
        'MessageText': msg.MessageText,
        'MessageFrom': msg.MessageFrom,
        'AvatarURL': msg.AvatarUrl
    }];
    var messageHtml = risechat.messageTemplate(context)
    var $msg = $('#messages');
    $msg.append(messageHtml);
    var h = $msg[0].scrollHeight;
    $msg.animate({ 'scrollTop': h }, 150);

});

socket.on('searchResults', function (results) {
    if (results.length > 0) {
        var searchHtml = risechat.searchTemplate(results);
        $('#searchResults').empty().html(searchHtml);
    } else {
        $('#searchResults').empty().html('<div><div class="msg-details"><span>No Search Results</span></div></div>');
    }
});

socket.on('getUsers', function (resp) {
    $(resp).each(function (i) {
        if (this.AvatarURL.indexOf('http') == -1) {
            var ind = resp.indexOf(this)
            resp.splice(ind, 1);
        }
    });
    var dirHtml = risechat.directoryTemplate(resp);
    $('#directory').html(dirHtml);
});

socket.on('updateChannelList', function (rooms) {
    console.log('updating channel: '+rooms)
    var list = $('.channels ul');
    $(rooms).each(function (i) {
        if ($("[data-room-id='" + rooms[i] + "']").length <= 0) {
            console.log('adding')
            $(list).append("<li><a class='change-room' data-room-id='" + rooms[i] + "'>#" + rooms[i] + "</a></li>")
        }
    });
})

socket.on('updateRoom', function (resp) {
    $('#messages .loading').remove();
    $('.change-room').removeClass('disabled');
    $("[data-room-id='" + resp.room + "']").addClass('disabled');
    $('#channelName').text('#'+resp.room);
    //$('#messages').html('<div class="flash"><em>You\'ve joined ' + resp.room + '</em></div>');
    $('.flash').show().delay(3000).fadeOut();

    //Loop through and format the dates
    $(resp.messages).each(function () {
        this.Posted = moment(this.Posted).format('h:mm a');
    });

    console.log(resp.messages);
    var messageHtml = risechat.messageTemplate(resp.messages.reverse())

    var $msg = $('#messages');
    $msg.append(messageHtml);
    var h = $msg[0].scrollHeight;
    $msg.scrollTop(h + 30);
});