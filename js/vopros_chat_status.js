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
        $('.chat-submit').attr('disabled', false).remove('disabled');
        $('.chat-status-message').hide();
      }
      else {
        // Do the reverse of the above.
        $('.vopros-chat-status-radio').attr('disabled', true);
        $('.vopros-chat-status-radio').parents('.form-type-radio').addClass('form-disabled');
        $('.vopros-chat-status-radio').parents().addClass('disabled_answer_type');
        $('.chat-submit').attr('disabled', true).addClass('disabled');
        var status_message = $('.chat-status-message');
        if (message.drupal_open) {
          status_message.text(Drupal.settings.vopros_chat.busy_message);
        }
        else {
          status_message.text(Drupal.settings.vopros_chat.closed_message);
        }
        $('.chat-status-message').show();
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
      var status_message = $('<p>banan</p>').addClass('chat-status-message').hide();
      $('.form-type-radios.form-item-user-answer-preference').append(status_message);
      Drupal.Nodejs.socket.emit('message', msg);
    }
  };

})(jQuery);
