/**
 * @file vopros_chat_admin_status.js
 *
 * JavaScript for the admin status bar.
 */

/* global jQuery, document */

(function ($) {
  var pulsing1 = false;
  var pulsing2 = false;
  var queue = 0;
  var unmanned = false;

  var pulse1 = function () {
    var link = $('.vopros-chat-admin-status a');
    var should_pulse = queue > 0;

    if (!should_pulse && pulsing1) {
      link.pulse('destroy');
      pulsing1 = false;
    }

    if (should_pulse && !pulsing1) {
      pulsing1 = true;
      link.pulse({'background-color': 'rgb(200,200,200)'}, {pulses: -1, duration: 1000});
    }
  };

  var pulse2 = function () {
    var li = $('.vopros-chat-admin-manned');
    var link = $('a', li);
    var should_pulse = unmanned;

    // Stop if we should or we need to swap color.
    if (!should_pulse && pulsing2) {
      li.hide();
      link.pulse('destroy');
      pulsing2 = false;
    }

    if (should_pulse && !pulsing2) {
      li.show();
      pulsing2 = true;
      link.pulse({'background-color': 'rgb(200,0,0)'}, {pulses: -1, duration: 250, returnDelay: 500});
    }
  };

  $(document).ready(function() {
    $('.toolbar-shortcuts ul').once('vopros-chat-admin-status', function() {
      $(this).append(Drupal.theme('voprosChatAdminStatus', {queue: 0}));
      $(this).append(Drupal.theme('voprosChatAdminManned'));
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
          .text(Drupal.t('In queue: @queue', {'@queue': vars.queue}))
          .attr('href', Drupal.settings.vopros_chat.chat_path)
          .addClass('vopros-chat-admin-status-text'));
  };

  /**
   * Theme function for rendering the manned status.
   */
  Drupal.theme.prototype.voprosChatAdminManned = function (vars) {
    return $('<li>')
      .addClass('leaf')
      .addClass('vopros-chat-admin-manned')
      .append(
        $('<a>')
          .text(Drupal.t('The chat is unmanned.'))
          .attr('href', Drupal.settings.vopros_chat.chat_path)
      )
      .hide();
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

      // Also request that the server sends us an update immediately.
      msg = {
        type: 'vopros_chat',
        action: 'chat_status'
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
      $.getJSON(Drupal.settings.vopros_chat.status_path, function (data) {
        $('.vopros-chat-admin-status-text .inner').text(Drupal.t('In queue: @queue', {'@queue': data}));
        var link = $('.vopros-chat-admin-status a');
        queue = data;
        pulse1();
      });
    }
  };

  /**
   * Nodejs callback to update the chat status.
   */
  Drupal.Nodejs.callbacks.voprosChatStatus = {
    callback: function(message) {
      // We're unmanned if Drupal thinks we should be but Nodejs doesn't.
      unmanned = message.drupal_open && !message.open;
      pulse2();
    }
  };
})(jQuery);
