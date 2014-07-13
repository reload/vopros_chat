/* global jQuery, Drupal */

(function ($) {
  Drupal.behaviors.voprosChat = {
    attach: function(context, settings) {
      // Scroll chat logs to the bottom.
      for (var channel in Drupal.settings.vopros_chat.chats) {
        if (Drupal.settings.vopros_chat.chats.hasOwnProperty(channel)) {
          var $log = $('#chat-log-' + channel);
          $log.scrollTop($log.height());
        }
      }
    }
  };
})(jQuery);
