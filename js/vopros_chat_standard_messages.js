
(function ($) {
  Drupal.behaviors.voprosChatStandardMessages = {
    attach: function (context, settings) {
      $('.standard-message').once('standard-message-processed', function() {
        var content = $('> .content', $(this));
        content.hide();
        $('> .title', $(this)).click(function (e) {
          e.preventDefault();
          content.slideToggle();
        });
        $('> .message', $(this)).click(function (e) {
          e.preventDefault();
          var chat = $(this).parents('.vopros-chat').get(0);
          var textarea = $(chat).find('textarea');
          textarea.val(textarea.val() + $(this).nextAll('.text').text());
          // Hide messages again.
          $('.standard-message > .content', chat).hide();
        });
      });
    }
  };
})(jQuery);
