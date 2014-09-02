
(function ($) {
  Drupal.behaviors.voprosChatStandardMessages = {
    attach: function (context, settings) {
      $('.standard-group').once('standard-group', function() {
        var content = $('> .content', $(this));
        content.hide();
        $('> .title', $(this)).click(function (e) {
          e.preventDefault();
          content.slideToggle('fast');
        });
      });
      $('.standard-message').once('standard-message', function() {
        $('> .message', $(this)).click(function (e) {
          e.preventDefault();
          var chat = $(this).parents('.vopros-chat').get(0);
          var textarea = $(chat).find('textarea');
          textarea.val(textarea.val() + $(this).nextAll('.text').text());
          // Hide messages again.
          $('.standard-group > .content', chat).slideUp('fast');
        });
      });
    }
  };
})(jQuery);
