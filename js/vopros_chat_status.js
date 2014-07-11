/**
 * @file vopros_chat_status.js
 *
 * JavaScript to update the open status of the chat.
 */

/* global jQuery, Drupal */

(function ($) {
  Drupal.Nodejs.callbacks.voprosChatStatus = {
    callback: function(message) {
      $('.vopros-chat-status').text(message.open ? Drupal.t('Open') : Drupal.t('Closed'));
    }
  };

  Drupal.Nodejs.connectionSetupHandlers.voprosChatStatus = {
    connect: function() {
      // Request that the server sends us an update immediately.
      var msg = {
        type: 'vopros_chat',
        action: 'chat_status'
      };
      Drupal.Nodejs.socket.emit('message', msg);
    }
  };

})(jQuery);
