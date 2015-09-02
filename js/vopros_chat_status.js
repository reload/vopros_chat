/**
 * @file vopros_chat_status.js
 *
 * JavaScript to update the open status of the chat.
 */

/* global jQuery, Drupal */

(function ($) {

  /**
   * Theme function for rendering the extend status info.
   */
  Drupal.theme.prototype.voprosChatStatus = function (vars) {
    return $('<p class="default-icon">').html(vars.text);
  };

  /**
   * Nodejs callback to update the chat status.
   */
  Drupal.Nodejs.callbacks.voprosChatStatus = {
    callback: function(message) {
      if (message.open) {
        // Remove the disabled attribute from the chat radio.
        $('.vopros-chat-status-radio').attr('disabled', false);
        // And remove the form-disabled class.
        $('.vopros-chat-status-radio').closest('.form-type-radio').removeClass('form-disabled');
        // Add "disabled" class to support IE8.
        $('.vopros-chat-status-radio').closest('.form-type-radio').removeClass('disabled_answer_type');
        // Ensure the submit button is enabled.
        $('.chat-submit').attr('disabled', false).removeClass('disabled');
        $('.chat-status-message').hide();
      }
      else {
        // Do the reverse of the above.
        $('.vopros-chat-status-radio').attr('disabled', true);
        $('.vopros-chat-status-radio').closest('.form-type-radio').addClass('form-disabled');
        $('.vopros-chat-status-radio').closest('.form-type-radio').addClass('disabled_answer_type');
        $('.chat-submit').attr('disabled', true).addClass('disabled');
        var status_message = $('.chat-status-message');
        var vars = {};
        if (message.drupal_open) {
          vars.text = Drupal.settings.vopros_chat.busy_message;
        }
        else {
          vars.text = Drupal.settings.vopros_chat.closed_message;
        }
        $('.chat-status-message').replaceWith(Drupal.theme('voprosChatStatus', vars).addClass('chat-status-message'));
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
      var status_message = Drupal.theme('voprosChatStatus', {text: ''}).addClass('chat-status-message').hide();
      $('.form-type-radios.form-item-user-answer-preference').append(status_message);
      Drupal.Nodejs.socket.emit('message', msg);
    }
  };

})(jQuery);
