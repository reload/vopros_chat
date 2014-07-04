/**
 * @file vopros_chat_admin_status.js
 *
 * JavaScript for the admin status bar.
 */

/* global jQuery, document */

(function ($) {
  $(document).ready(function() {
    $('.toolbar-shortcuts ul').once('vopros-chat-admin-status', function() {
      $(this).append(Drupal.theme('voprosChatAdminStatus', {text: 'Status', href: '/'}));
    });
  });

  Drupal.theme.prototype.voprosChatAdminStatus = function (vars) {
    return $('<li>')
      .addClass('leaf')
      .addClass('vopros-chat-admin-status')
      .append(
      $('<a>')
          .text(vars.text)
          .attr('href', vars.href));
  };
  Drupal.Nodejs.callbacks.voprosChatAdminStatus = {
    callback: function (message) {
      console.log(message);
      $('.vopros-chat-admin-status').replaceWith(Drupal.theme('voprosChatAdminStatus', {text: message.channels, href: '/'}));
    }
  };

})(jQuery);
