(function ($) {
  Drupal.behaviors.voprosChat = {
    attach: function(context, settings) {
      // Scroll chat logs to the bottom.
      for (var channel in Drupal.settings.vopros_chat.chats) {
        console.log(channel);
        var log = $('#chat-log-' + channel);
        log.scrollTop(log.height());
      }
    }
  }
})(jQuery);
