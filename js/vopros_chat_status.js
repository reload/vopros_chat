/**
 * @file vopros_chat_status.js
 *
 * JavaScript to update the open status of the chat.
 */

/* global jQuery, Drupal */

(function ($) {
  /**
   * Nodejs callback to update the chat status.
   */
  Drupal.Nodejs.callbacks.voprosChatStatus = {
    callback: function(message) {
      if (message.open) {
        // Remove the disabled attribute from the chat radio.
        $('.vopros-chat-status-radio').attr('disabled', false);
        // And remove the form-disabled class.
        $('.vopros-chat-status-radio').parents('.form-type-radio').removeClass('form-disabled');
        // Add "disabled" class to support IE8.
        $('.vopros-chat-status-radio').parents().removeClass('disabled_answer_type');
        // Ensure the submit button is enabled.
        $('.chat-submit').attr('disabled', false);
      }
      else {
        // Do the reverse of the above.
        $('.vopros-chat-status-radio').attr('disabled', true);
        $('.vopros-chat-status-radio').parents('.form-type-radio').addClass('form-disabled');
        $('.vopros-chat-status-radio').parents().addClass('disabled_answer_type');
        $('.chat-submit').attr('disabled', true);
      }
    }
  };

  /**
   * Subscribe to chat status updates.
   */
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
