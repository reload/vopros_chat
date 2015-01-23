/**
 * @file vopros_chat.admin.js
 *
 * Node JS callbacks and general admin Javascript code for Vopro Chat.
 */

/* global jQuery, Drupal, window, Notification */

(function($) {
  // Keeps track of channels with users, that is, active.
  var activeChannels = {};

  var timestamp = function() {
    return ((new Date()).getTime() / 1000);
  };

  var timer = null;

  var volatile = Drupal.voprosEmbed.volatile.client(Drupal.t("The chat will close if you are the last editor to leave."));

  /**
   * Add a jQuery animation method for flashing an element.
   */
  $.fn.flash = function(duration ) {
    var current = this.css('background-color');
    return this.animate({'background-color': 'rgb(255,255,255)'}, duration / 2)
      .animate({'background-color': current}, duration / 2);
  };

  /**
   * Show notification to admins via jGrowl.
   */
  var notify = function(notification) {
    var message = Drupal.t(notification.string, notification.args);
    var notification_settings = Drupal.settings.vopros_chat.notification;
    $.playSound(notification_settings.sound);
    $('.vopros-chat-admin-status').flash(500);
    if (Notification.permission !== 'granted') {
      Notification.requestPermission();
    }
    var n = new Notification(message, {
      body: message,
      icon: notification_settings.jsPath + '/star.ico'
    });
  };

  var idleString = function(idle) {
    var idleString = '';
    if (idle > 60) {
      idleString = Math.floor(idle / 60) + ' min ';
    }
    return idleString + (idle % 60) + ' secs';
  };

  var updateCallback = function() {
    $('.idleTimer').each(function() {
      var current = timestamp();
      var offset = current - parseFloat($(this).attr('data-timestamp'));
      var idle = Math.floor(parseFloat($(this).attr('data-idle')) + offset);
      var text = $(this).attr('data-idle-text');

      $(this).text(text + idleString(idle));
    });
    timer = window.setTimeout(updateCallback, 1000);
  };

  Drupal.Nodejs.callbacks.voprosChatAdminChannelStatus = {
    callback: function (message) {
      // Refresh the channel listing if so instructed by the server.
      if (message.refresh) {
        $('#vopros-chat-admin-channel-list').trigger('vopros-chat-admin-refresh-channels');
      }
      // Notify admins of the joined user.
      if (message.notification) {
        try {
          notify(message.notification);
        }
        catch (e) {
          if (console) {
            console.dir(e);
          }
        }
      }

      $('span[data-channel-name=' + message.channel_name + ']').each(function () {
        // Only show counter for channels with users in it and no admin users.
        if (message.admin_users < 1 || message.users === message.admin_users) {
          activeChannels[message.channel_name] = message.channel_name;

          var idle = Math.floor(message.ref_time - message.timestamp);

          $(this).addClass('idleTimer');
          $(this).attr('data-timestamp', timestamp());
          $(this).attr('data-idle', idle);

          var text = message.users > message.admin_users ?
            'Idle: ' : 'User offline: ';
          $(this).attr('data-idle-text', text);
        }
        else {
          delete activeChannels[message.channel_name];
          $(this).removeClass('idleTimer');
          if (message.admin_users > 0) {
            $(this).text(Drupal.t('Being answered'));
          }
          else {
            $(this).text(Drupal.t('Empty'));
          }
        }
      });

      // Check if there's any active channels and start/stop the
      // update timer accordingly.
      var wantTicker = false;
      for (var key in activeChannels) {
        if (activeChannels.hasOwnProperty(key)) {
          wantTicker = true;
          updateCallback();
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
  Drupal.behaviors.voprosChatAdmin = {
    attach: function(context, settings) {
      volatile.set(true);
      $('#vopros-chat-admin-channel-list').once('voproc-chat', function() {
        if (typeof Drupal.Nodejs.socket.emit === 'undefined') {
          // No socket, which usuallay means no server. Print a message.
          $(this).append(Drupal.t('Could not communicate with chat server. Reload page to try again.'));
          return;
        }
        var base = $(this).attr('id');
        var elementSettings = {
          url: Drupal.settings.vopros_chat.chat_path + '/channels',
          event: 'vopros-chat-admin-refresh-channels',
          progress: {
            type: 'throbber'
          }
        };
        Drupal.ajax[base] = new Drupal.ajax(base, this, elementSettings);
      });

    }
  };

  /**
   * Behaviour to make question links open a chat.
   */
  Drupal.behaviors.voprosChatAdminLinks = {
    attach: function(context, settings) {
      var loadListing = false;
      $('.view-vopros-chat-question-list').once('voproc-chat', function() {
        $('a', this).each(function() {
          var questionId = $(this).attr('href').split('/').pop();
          var base = 'vopros-chat-' + questionId;
          $(this).attr('id', base);
          $(this).addClass('vopros-chat-admin-' + questionId + '-on chat-admin-on');
          // Add an hidden element with the same text as the link,
          // which will be shown instead of the link when the chat is
          // loaded. See Drupal.behaviors.voprosChatAdminDisableLinks.
          var no_link = $('<span></span>').text($(this).text()).addClass('vopros-chat-admin-' + questionId + '-off chat-admin-off');
          no_link.hide();
          $(this).after(no_link);
          var elementSettings = {
            url: Drupal.settings.vopros_chat.chat_path + '/add/' + questionId,
            event: 'click',
            progress: {
              type: 'throbber'
            }
          };
          Drupal.ajax[base] = new Drupal.ajax(base, this, elementSettings);
        });
        loadListing = true;
      });

      if (loadListing) {
        // Also update list with current status.
        var msg = {
          type: 'vopros_chat_admin',
          action: 'list_all'
        };
        Drupal.Nodejs.socket.emit('message', msg);
      }
    }
  };

  /**
   * Behavior to disable the link for opening the chat when the chat
   * is open.
   */
  Drupal.behaviors.voprosChatAdminDisableLinks = {
    // Not using the context, as jQuery wont find .vopros-chat-admin
    // when it's set on the topmost element of the context. As the
    // attach and detatch functions are idempotent, this doesn't have
    // side effects.. Also, it has the nice side effect of ensuring
    // the listing is in sync with whatever chats are currently
    // visible on the page.
    attach: function() {
      var maxChats = Drupal.settings.vopros_chat.maxChats || 2;
      if ($('.vopros-chat-admin').length >= maxChats) {
        // If maxchats has been reached, disable all links.
        $('.chat-admin-on').hide();
        $('.chat-admin-off').show();
      }
      else {
        // Otherwise disable active chats.
        $('.vopros-chat-admin').each(function () {
          var chatId = $(this).attr('id');
          $('.' + chatId + '-on').hide();
          $('.' + chatId + '-off').show();
        });
      }
    },
    detach: function() {
      var maxChats = Drupal.settings.vopros_chat.maxChats || 2;
      if ($('.vopros-chat-admin').length <= maxChats) {
        // If no longer over maxchats, re-enable links.
        $('.chat-admin-on').show();
        $('.chat-admin-off').hide();
      }
      $('.vopros-chat-admin').each(function () {
        // Else re-enable left chat.
        var chatId = $(this).attr('id');
        $('.' + chatId + '-on').show();
        $('.' + chatId + '-off').hide();
      });
    }
  };

  /**
   * Behavior to show loading bar.
   */
  Drupal.behaviors.voprosChatAdminServerLoading = {
    attach: function() {
      $('.vopros-chat-server-loading').each(function () {
        // Create a progress bar that fills over 5 seconds and then
        // reload the page. Should give the server enuogh time to boot
        // up.
        var progress = 0;
        var progressBar = new Drupal.progressBar('vopros-chat-server-loading');
        $(this).append(progressBar.element);
        progressBar.setProgress(-1, Drupal.t('Starting server, one moment please.'));
        var interval = setInterval(function () {
          progress = progress + 1;
          progressBar.setProgress(progress * 2);
          if (progress >= 50) {
            clearInterval(interval);
            window.location.reload();
          }
        }, 100);
      });
    }
  };

  Drupal.Nodejs.connectionSetupHandlers.voprosChatAdmin = {
    connect: function() {
      // Update the channel listing when nodejs (re)connects.
      $('#vopros-chat-admin-channel-list').trigger('vopros-chat-admin-refresh-channels');

      if (Drupal.settings.vopros_chat.admin_signin) {
        //  When connecting to the server, notify that we're an admin.
        var msg = {
          type: 'vopros_chat_admin',
          action: 'admin_signin'
        };
        Drupal.Nodejs.socket.emit('message', msg);
      }
    }
  };
})(jQuery);
