/**
 * @file vopros_chat.js
 *
 * Node JS Callbacks and general Javascript code for the Vopros Chat module.
 */

/* global jQuery, Drupal, Autolinker */

(function ($) {

  Drupal.voprosChat = Drupal.voprosChat || {};

  // Create an id for this browser window.
  var sessionId = Math.floor(Math.random() * 10000000000000001);

  var keyUpHandler = function(e) {
    if (e.keyCode === 13 && !e.shiftKey && !e.ctrlKey) {
      Drupal.voprosChat.processMessageArea(e);
    }
    else {
      return true;
    }
  };

  var submitHandler = function (e) {
    e.preventDefault();
    e.stopPropagation();
    Drupal.voprosChat.processMessageArea(e);
  };

  var appendToLog = function(channel, messageContent) {
    var currentTime = new Date();
    var messageTime = '<span class="message-time">' + currentTime.format('G:i') + '</span>';

    // Assemble the markup for the message.
    var messageMarkUp = '<div class="vopros-chat-message"><div class="message-content"> ' + messageContent + '</div>' + messageTime + '</div>';

    $('#' + channel + ' .chat-log').append(messageMarkUp);

    // Scroll to the last line. TODO: This has to be improved, to avoid
    // auto-scrolling when a user is reading the comments log. Checking if the
    // chat-log div is focused might be enough.
    $('#' + channel + ' .chat-log')[0].scrollTop = $('#' + channel + ' .chat-log')[0].scrollHeight;
  };

  /**
   * Update the volatility depending on whether there's active chats.
   */
  var update_volatile = function() {
    var active = false;
    if (Drupal.settings.vopros_chat && Drupal.settings.vopros_chat.chats) {
      $.each(Drupal.settings.vopros_chat.chats, function(i, chat) {
        if (chat.initialised) {
          active = true;
          return false;
        }
      });

      Drupal.voprosEmbed.volatile.set(active);
    }
  };

  /**
   * Leave channel when the chat is removed from the page.
   */
  Drupal.behaviors.vopros_chat_leave_channel = {
    detach: function(context) {
      $('.vopros-chat', context).each(function () {
        var channelId = $(this).attr('id');
        var msg = {
          type: 'vopros_chat',
          action: 'chat_part',
          channel: channelId,
          // Set the callback so all users know a new user has entered the chat.
          callback: 'voprosChatUserOfflineHandler',
          data: {
            user: Drupal.settings.vopros_chat.currentUser
          }
        };
        Drupal.Nodejs.socket.emit('message', msg);
      });
    }
  };

  Drupal.voprosChat.initialiseChat = function() {
    for (var chatId in Drupal.settings.vopros_chat.chats) {
      if (Drupal.settings.vopros_chat.chats.hasOwnProperty(chatId)) {
        var chat = Drupal.settings.vopros_chat.chats[chatId];
        if (!chat.initialised) {
          chat.initialised = true;
          update_volatile();

          // Add a unique session id so we can spot our own messages.
          Drupal.settings.vopros_chat.currentUser.sessionId = sessionId;
          // Let the client join the channel.
          Drupal.voprosChat.addClientToChatChannel(chat.channel);

          // Chat form events handling.
          $('#' + chat.channel + ' .form-type-textarea textarea').keyup(keyUpHandler);

          $('#' + chat.channel + ' .form-submit').click(submitHandler);
        }
      }
    }
  };

  Drupal.voprosChat.deinitialiseChat = function() {
    for (var chat in Drupal.settings.vopros_chat.chats) {
      if (Drupal.settings.vopros_chat.chats.hasOwnProperty(chat)) {
        Drupal.settings.vopros_chat.chats[chat].initialised = false;
      }
    }
    update_volatile();
  };

  if (Drupal.ajax) {
    /**
     * Ajax command for reintialzing chats.
     */
    Drupal.ajax.prototype.commands.voprosChatReinitialize = function () {
      Drupal.voprosChat.initialiseChat();
    };
  }

  Drupal.Nodejs.connectionSetupHandlers.voprosChat = {
    connect: function() {
      Drupal.voprosChat.initialiseChat();
    },
    disconnect: function() {
      Drupal.voprosChat.deinitialiseChat();
    }
  };

  Drupal.Nodejs.callbacks.voprosChatUserOnlineHandler = {
    callback: function (message) {
      if (message.data.user.sessionId !== sessionId) {
        $('#' + message.channel + ' .chat-log').append('<div class="vopros-chat-message">' + message.data.user.name + ' joined</div>');
      }

    }
  };

  Drupal.Nodejs.callbacks.voprosChatUserOfflineHandler = {
    callback: function (message) {
      if (message.data.user.sessionId !== sessionId) {
        $('#' + message.channel + ' .chat-log').append('<div class="vopros-chat-message">' + message.data.user.name + ' left</div>');
      }
      // In case it was ourselves.
      update_volatile();
    }
  };

  Drupal.Nodejs.callbacks.voprosChatMessageHandler = {
    callback: function(message) {
      var msg = message.data;

      var messageAuthor = '<span class="message-author' + ((msg.sessionId === sessionId) ? ' message-author-me' : '') + '">' + (msg.sessionId === sessionId ? Drupal.t('Me') : msg.name) + ': </span>';

      // Auto link URLs and mail addresses. Don't auto link Twitter
      // handles because Drupals text filter won't do that.
      var parsedText = Autolinker.link(msg.msg, {stripPrefix: false, twitter: false});

      // Render new lines as <br />.
      parsedText = parsedText.replace(/\n/g, '<br/>');

      var messageText = '<span class="message-text">' + parsedText + '</span>';

      // Finally, add it to the chat log.
      appendToLog(message.channel, messageAuthor + messageText);
    }
  };

  Drupal.Nodejs.callbacks.closeChannelHandler = {
    callback: function(message) {
      var messageText = '<span class="message-server-message">' + message.data.msg + '</span>';

      appendToLog(message.channel, messageText);
      // Disable the input field.
      $('#' + message.channel + ' .form-type-textarea textarea').attr('disabled', 'disabled');
      Drupal.settings.vopros_chat.chats[message.channel].initialised = false;
      update_volatile();
    }
  };

  Drupal.voprosChat.addClientToChatChannel = function(channelId) {
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

  Drupal.voprosChat.postMessage = function(message, channel) {
    var msg = {
      type: 'vopros_chat',
      action: 'chat_message',
      channel: channel,
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

  Drupal.voprosChat.processMessageArea = function(e) {
    var channel = $(e.target).closest('.vopros-chat').attr('id');
    var messageText = $('<div></div>').text($('#' + channel + ' .form-type-textarea textarea').val()).html().replace(/^\s+$/g, '');
    if (messageText) {
      Drupal.voprosChat.postMessage(messageText, channel);
      $('#' + channel + ' .form-type-textarea textarea').val('').focus();
    }
  };

})(jQuery);
