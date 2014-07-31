/**
 * @file vopros_chat_admin_status.js
 *
 * JavaScript for the admin status bar.
 */

/* global jQuery, document */

(function ($) {
  $(document).ready(function() {
    $('.toolbar-shortcuts ul').once('vopros-chat-admin-status', function() {
      $(this).append(Drupal.theme('voprosChatAdminStatus', {channels: 0, channels_with_admins: 0}));
    });
  });

  /**
   * Theme function for rendering the status.
   */
  Drupal.theme.prototype.voprosChatAdminStatus = function (vars) {
    return $('<li>')
      .addClass('leaf')
      .addClass('vopros-chat-admin-status')
      .append(
      $('<a>')
          .text(Drupal.t('Chat: @channels/@admins', {'@channels': vars.channels, '@admins': vars.channels_with_admins}))
          .attr('href', '/'));
  };

  /**
   * Connection setup handler.
   *
   * Asks the server for status updates.
   */
  Drupal.Nodejs.connectionSetupHandlers.voprosChatAdminStatus = {
    connect: function() {
      // Request that the server sends us updates.
      var msg = {
        type: 'vopros_chat_admin',
        action: 'admin_status'
      };
      Drupal.Nodejs.socket.emit('message', msg);
    }
  };

  /**
   * NodeJS message callback.
   *
   * Updates status bar.
   */
  Drupal.Nodejs.callbacks.voprosChatAdminStatus = {
    callback: function (message) {
      console.log(message);
      $('.vopros-chat-admin-status').replaceWith(Drupal.theme('voprosChatAdminStatus', message));
    }
  };

})(jQuery);
