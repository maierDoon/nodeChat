/*global io, $*/
(function () {
    'use strict';
    
    var socket = io(),
        messageText = $('#message'),
        messages = $('#messages'),
        chattersList = $('#chatters'),
        typersMsg = $('#typers'),
        messageError = $('#messageError'),
        typing,
        typingTimeout,
        name;
    
    $('#login').submit(function (event) {
        event.preventDefault();
        
        name = $('#name').val().trim();
        if (name.length === 0) {
            $('#error').text('You must enter a name');
        } else {
            socket.emit('login', name, function (success) {
                if (success) {
                    $('#username').text(name);
                    $('#login').hide();
                    $('#messagesContainer').show();
                } else {
                    $('#error').text(name + ' is already being used. Pick another name');
                }
            });
        }  
    });
    
    function typingEnded() {
        socket.emit('typing', false);
        typing = false;
    }
    
    messageText.keyup(function () {
        messageError.text('');
        if(messageText.val().indexOf('@') === 0) {
            return;
        }
        
        clearTimeout(typingTimeout);
        if (!typing) {
            socket.emit('typing', true);
        }
        typing = true;
        typingTimeout = setTimeout(typingEnded, 5000);
    });
    
    $('#messageForm').submit(function (event) {
        event.preventDefault();
        typingEnded();
        socket.emit('message', messageText.val(), function (err) {
            if (err) {
                messageError.text(err);
            }
        });
        messageText.val('');
    });
    
    function addMessage(type, data) {
        messages.append('<span class="' + type + '">' + data.name + ' says: ' + data.msg + '</span><br/>');
    }
    
    socket.on('message', function (data) {
        addMessage('msg', data);
    });
    
    socket.on('privatemessage', function (data) {
        addMessage('private', data);
    });
    
    socket.on('info', function (data) {
        messages.append('<span class="info">' + data.name + ' has ' +
                        (data.joined ? 'joined' : 'left') +
                        ' the chat</span><br/>');
    });
    
    socket.on('chatters', function (data) {
        chattersList.empty();
        data.forEach(function (chatter) {
            chattersList.append('<li>' + chatter + '</li>');
        });
    });
    
    socket.on('typing', function (typers) {
        var msg = '',
            index = typers.indexOf(name);
        if (index >= 0) {
            typers.splice(index, 1);
        }
        
        if (typers.length) {
            if (typers.length < 3) {
                msg += typers.join(' and ');
            } else {
                msg += 'Users';
            }
            msg += typers.length === 1 ? " is" : " are";
            msg += ' typing...';
        }
        typersMsg.text(msg);
    });
}());