/**
 * @file vopros_chat.admin.js
 *
 * Node JS callbacks and general admin Javascript code for Vopro Chat.
 */

(function($) {
  /**
   * Variable to keep track of time offset to the server time.
   */
  var offset = 0;

  // Keeps track of channels with users, that is, active.
  var activeChannels = {};

  var timestamp = function() {
    return ((new Date()).getTime() / 1000);
  };

  var timer = null;

  var updateCallback = function() {
    $('.idleTimer').each(function() {
      var current = timestamp();
      var offset = current - parseFloat($(this).attr('data-timestamp'));
      var idle = Math.floor(parseFloat($(this).attr('data-idle')) + offset);


        $(this).text("Idle: " + idleString(idle));
    });
    timer = window.setTimeout(updateCallback, 1000);
  };

  var idleString = function(idle) {
    var idleString = '';
    if (idle > 60) {
      idleString = Math.floor(idle / 60) + ' min ';
    }
    return idleString + (idle % 60) + ' secs';
  };

  Drupal.Nodejs.connectionSetupHandlers.vopros_chat_admin = {

    connect: function() {
      var msg = {
        type: 'vopros_chat_admin',
        action: 'subscribe',
      };
      Drupal.Nodejs.socket.emit('message', msg);
    }
  };

  Drupal.Nodejs.callbacks.voprosChatAdminStatus = {
    callback: function (message) {
      var time = ((new Date()).getTime() / 1000);
      $('span[data-channel-name=' + message.channel_name + ']').each(function () {
        // Only show counter for channels with users in it.
        if (message.users > 0) {
          activeChannels[message.channel_name] = message.channel_name;
          offset = time - message.ref_time;

          var idle = Math.floor(message.ref_time - message.timestamp);

          $(this).addClass('idleTimer');
          $(this).attr('data-timestamp', timestamp());
          $(this).attr('data-idle', idle);

          $(this).text("Idle: " + idleString(idle));
        }
        else {
          delete activeChannels[message.channel_name];
          $(this).text("Empty");
        }

      });

      // Check if there's any active channels and start/stop the
      // update timer accordingly.
      var wantTicker = false;
      for (var key in activeChannels) {
        if (activeChannels.hasOwnProperty(key)) {
          wantTicker = true;
          break;
        }
      }
      if (wantTicker && timer === null) {
        timer = window.setTimeout(updateCallback, 1000);
      }
      else if (!wantTicker && timer !== null) {
        window.clearTimeout(timer);
        timer = null;
      }
    }
  };

})(jQuery);
