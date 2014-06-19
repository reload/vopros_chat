/**
 * @file vopros_chat.js
 *
 * Node JS Callbacks and general Javascript code for the Node JS Chat module.
 */

(function ($) {

  Drupal.vopros_chat = Drupal.vopros_chat || {'initialised' : false};
  var chatIdsMapping = {};
  // Create an id for this browser window.
  var sessionId = Math.floor(Math.random() * 10000000000000001);

  var keyUpHandler = function(e) {
    if (e.keyCode == 13 && !e.shiftKey && !e.ctrlKey) {
      Drupal.vopros_chat.processMessageArea(e);
    }
    else {
      return true;
    }
  };

  var submitHandler = function (e) {
    e.preventDefault();
    e.stopPropagation();
    Drupal.vopros_chat.processMessageArea(e);
  };

  Drupal.vopros_chat.initialiseChat = function() {
    for (var chat in Drupal.settings.vopros_chat.chats) {
      // Add a unique session id so we can spot our own messages.
      Drupal.settings.vopros_chat.currentUser.sessionId = sessionId;
      // Let the client join the channel.
      Drupal.vopros_chat.addClientToChatChannel(Drupal.settings.vopros_chat.chats[chat].channel);

      // Chat form events handling.
      var chatID = '#vopros_chat_' + Drupal.settings.vopros_chat.chats[chat].channel;
      chatIdsMapping[chatID] = Drupal.settings.vopros_chat.chats[chat].channel;

      $(chatID + ' .form-type-textarea textarea').keyup(keyUpHandler);

      $(chatID + ' .form-submit').click(submitHandler);
    }
  };

  Drupal.Nodejs.connectionSetupHandlers.vopros_chat = {
    connect: function() {
      Drupal.vopros_chat.initialiseChat();
      Drupal.vopros_chat.initialised = true;
    }
  };

  Drupal.Nodejs.callbacks.voprosChatUserOnlineHandler = {
    callback: function (message) {
      if (message.data.user.sessionId != sessionId) {
        var chatID = '#vopros_chat_' + message.channel;
        $(chatID + ' .chat-log').append('<div class="vopros-chat-message">' + message.data.user.name + ' joined</div>');
      }

    }
  };

  Drupal.Nodejs.callbacks.voprosChatMessageHandler = {
    callback: function(message) {
      var msg = message.data;
      var chatID = '#vopros_chat_' + message.channel;

      // Get current date, to display the time at which the message was sent.
      var currentTime = new Date();
      var messageTime = '<span class="message-time">' + currentTime.getHours() + ':' + currentTime.getMinutes() + '</span>';
      var messageAuthor = '<span class="message-author">' + (msg.sessionId == sessionId ? Drupal.t('Me') : msg.name) + ':</span>';

      // Display URLs as proper links.
      // After failing for some time with my custom regex, took one from
      // http://kroltech.com/2013/05/quick-tip-regex-to-convert-urls-in-text-to-links-javascript/,
      // because I'm no man of honor.
      var regexp = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
      var parsedText = msg.msg.replace(regexp, "<a href='$1' target='_blank'>$1</a>");

      var messageText = '<span class="message-text">' + parsedText + '</span>';

      // Assemble the markup for the message.
      var messageMarkUp = '<div class="vopros-chat-message"><div class="message-content"> ' + messageAuthor + messageText + '</div>' + messageTime + '</div>';

      // Finally, add it to the chat log.
      $(chatID + ' .chat-log').append(messageMarkUp);

      // Scroll to the last comment. TODO: This has to be improved, to avoid
      // auto-scrolling when a user is reading the comments log. Checking if the
      // chat-log div is focused might be enough.
      $(chatID + ' .chat-log')[0].scrollTop = $(chatID + ' .chat-log')[0].scrollHeight;
    }
  };

  Drupal.vopros_chat.addClientToChatChannel = function(channelId) {
    var msg = {
      type: 'vopros_chat',
      action: 'chat_init',
      channel: channelId,
      // Set the callback so all users know a new user has entered the chat.
      callback: 'voprosChatUserOnlineHandler',
      data: {
        user: Drupal.settings.vopros_chat.currentUser
      }
    };
    Drupal.Nodejs.socket.emit('message', msg);
  };

  Drupal.vopros_chat.postMessage = function(message, channelDomId) {
    var channelId = chatIdsMapping[channelDomId];

    var msg = {
      type: 'vopros_chat',
      action: 'chat_message',
      channel: channelId,
      callback: 'voprosChatMessageHandler',
      data: {
        uid: Drupal.settings.vopros_chat.currentUser.uid,
        name: Drupal.settings.vopros_chat.currentUser.name,
        sessionId: sessionId,
        msg: message
      }
    };
    Drupal.Nodejs.socket.emit('message', msg);
  };

  Drupal.vopros_chat.processMessageArea = function(e) {
    var domChatID = '#' + $(e.target).closest('.vopros-chat').attr('id');
    var messageText = $('<div></div>').text($(domChatID + ' .form-type-textarea textarea').val()).html().replace(/^\s+$/g, '');
    if (messageText) {
      Drupal.vopros_chat.postMessage(messageText, domChatID);
      $(domChatID + ' .form-type-textarea textarea').val('').focus();
    }
  };

})(jQuery);
