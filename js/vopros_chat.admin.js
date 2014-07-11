/**
 * @file vopros_chat.admin.js
 *
 * Node JS callbacks and general admin Javascript code for Vopro Chat.
 */

/* global jQuery */

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

  Drupal.Nodejs.callbacks.voprosChatAdminStatus = {
    callback: function (message) {
      // Refresh the channel listing if so instructed by the server.
      if (message.refresh) {
        $('#vopros-chat-admin-channel-list').trigger('vopros-chat-admin-refresh-channels');
      }

      // Notify admins of the joined user.
      if (message.notification) {
        notify(message.notification);
      }

      var time = ((new Date()).getTime() / 1000);
      $('span[data-channel-name=' + message.channel_name + ']').each(function () {
        // Only show counter for channels with users in it and no admin users.
        if (message.users > 0 && message.admin_users < 1) {
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
          $(this).removeClass('idleTimer');
          if (message.admin_users > 0) {
            $(this).text(Drupal.t("Being answered"));
          }
          else {
            $(this).text(Drupal.t("Empty"));
          }
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

  /**
   * Behavior to attach ajax loading to channel list and chats.
   */
  Drupal.behaviors.vopros_chat_admin = {
    attach: function(context, settings) {
      $('#vopros-chat-admin-channel-list').once('voproc-chat', function() {
        if (typeof Drupal.Nodejs.socket.emit == 'undefined') {
          // No socket, which usuallay means no server. Print a message.
          $(this).append(Drupal.t('Could not communicate with chat server. Reload page to try again.'));
          return;
        }
        var base = $(this).attr('id');
        var element_settings = {
          url: '/admin/vopros/questions/chat/channels',
          event: 'vopros-chat-admin-refresh-channels',
          progress: {
            type: 'throbber'
          }
        };
        Drupal.ajax[base] = new Drupal.ajax(base, this, element_settings);
      });

    }
  };

  /**
   * Behaviour to make question links open a chat.
   */
  Drupal.behaviors.vopros_chat_admin_links = {
    attach: function(context, settings) {
      var loadListing = false;
      $('.view-vopros-chat-question-list').once('voproc-chat', function() {
        $('a', this).each(function() {
          var question_id = $(this).attr('href').split('/').pop();
          var base = 'vopros-chat-' + question_id;
          $(this).attr('id', base);
          var element_settings = {
            url: '/admin/vopros/questions/chat/add/' + question_id,
            event: 'click',
            progress: {
              type: 'throbber'
            }
          };
          Drupal.ajax[base] = new Drupal.ajax(base, this, element_settings);
        });
        loadListing = true;
      });

      if (loadListing) {
        // Also update list with current status.
        var msg = {
          type: 'vopros_chat_admin',
          action: 'list_all',
        };
        Drupal.Nodejs.socket.emit('message', msg);
      }
    }
  };

  Drupal.Nodejs.connectionSetupHandlers.vopros_chat_admin = {
    connect: function() {
      // Update the channel listing when nodejs (re)connects.
      $('#vopros-chat-admin-channel-list').trigger('vopros-chat-admin-refresh-channels');
    }
  };

  /**
   * Show notification to admins via jGrowl.
   */
  var notify = function(notification) {
    var message = Drupal.t(notification.string, notification.args);
    $.jGrowl(message, Drupal.settings.voprosChatNotificationConfig);
    $.playSound(Drupal.settings.voprosChatNotificationSound);
    if (Notification.permission !== 'granted') {
      Notification.requestPermission();
    }
    n = new Notification(message, {
      body: message,
      icon: Drupal.settings.voprosChatNotificationNotificationJsPath + '/star.ico'
    });
  };
})(jQuery);
