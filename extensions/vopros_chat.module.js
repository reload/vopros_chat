/**
 * @file vopros_chat.module.js
 *
 * Node JS Chat Server extension.
 */

/* global exports */

var crypto = require('crypto'),
    drupal = require('drupal'),
    hashish = require('hashish');

exports.setup = function (config) {
  var publishMessageToClient = config.publishMessageToClient;
  var publishMessageToChannel = config.publishMessageToChannel;
  var addClientToChannel = config.addClientToChannel;

  // Global open/closed status for the chat.
  var openStatus = false;

  var adminChannel = 'vopros_admin_status';

  /**
   * Return a unix timestamp for the current time.
   */
  var timestamp = function() {
    return (new Date()).getTime() / 1000;
  };

  /**
   * Send notification about channel activity to admin users.
   */
  var updateChannelStatus = function(channelName, refTime, refresh, notification) {
    var channel = config.channels[channelName];
    if (channelName === adminChannel ||
        !channel ||
        !hashish(channel).has('timestamp')) {
      return;
    }

    if (!config.channels[adminChannel]) {
      console.log('Creating admin channel.');
      config.channels[adminChannel] = {'sessionIds': {}};
    }

    if (!refTime) {
      refTime = timestamp();
    }

    // Ensure boolean.
    refresh = refresh ? true : false;

    var adminUsers = 0;
    adminUsers = hashish(channel.sessionIds).filter(function (sessionId) {
      return hashish(config.channels[adminChannel].sessionIds).has(sessionId);
    }).length;

    var message = {
      'callback': 'voprosChatAdminChannelStatus',
      'channel': adminChannel,
      'channel_name': channelName,
      'users': Object.keys(channel.sessionIds).length,
      'admin_users': adminUsers,
      'timestamp': channel.timestamp,
      'ref_time': refTime,
      'refresh': refresh,
      'notification': notification
    };

    publishMessageToChannel(message);

    // Also trigger updating of chat status in the admin bar.
    updateAdminStatus();
  };

  /**
   * Send overall chat status notification to admin users.
   */
  var updateAdminStatus = function () {
    var channelsWithAdmins = 0;
    var adminSessionIds = hashish(config.channels[adminChannel].sessionIds).values;
    console.dir(adminSessionIds);
    var channelCount = hashish(config.channels).filter(function (channel, channelId) {
      // Ignore the admin channel.
      if (channelId == adminChannel) {
        return false;
      }
      // And empty channels.
      if (channel.sessionIds.length < 1) {
        return false;
      }
      if (hashish(channel).has('timestamp')) {
        if (hashish(channel.sessionIds).has(adminSessionIds)) {
          channelsWithAdmins++;
        }
        return true;
      }
    }).length;
    console.dir(config.channels);
console.log('');
    var message = {
      'callback': 'voprosChatAdminStatus',
      'channel': adminChannel,
      'channels': channelCount,
      'channels_with_admins': channelsWithAdmins
    };

    publishMessageToChannel(message);
  };

  var connectToDatabase = function(config) {
    // Filter out empty values, and extract only the ones we need.
    var options = hashish(config.settings.database)
      .filter(function (x) {return x !== '';})
      .extract(['host', 'port', 'username', 'password', 'database'])
      .compact.end;

    // We use 'username', mysql class use 'user'.
    if (options.hasOwnProperty('username')) {
      options.user = options.username;
      delete options.username;
    }

    // Connect to the database.
    drupal.db.connect(options);
  };
  connectToDatabase(config);

  var checkHash = function(message) {
    // First compare hash value of question id.
    var questionId = message.channel.split('__')[1].split('_')[0];
    var questionHashFromUrl = message.channel.split('__')[1].split('_')[1];
    var questionHashCalculated = crypto
      .createHash('sha256')
      .update(config.settings.serviceKey + questionId)
      .digest('hex');

    // Only add client to channel if hash values match.
    if (questionHashCalculated === questionHashFromUrl) {
      return true;
    }
    console.log('Vopros Chat extension received wrong hash of question id.');
    return false;
  };

  var logMessageToDatabase = function(message) {
    var questionId = message.channel.split('__')[1].split('_')[0];
    var table = config.settings.database_tables['{vopros_chat_log}'];
    var timestamp = Math.floor(Date.now() / 1000);
    drupal.db.query('INSERT INTO `' + table + '` (timestamp, question_id, uid, name, session_id, msg) VALUES (?, ?, ?, ?, ?, ?)', [timestamp, questionId, message.data.uid, message.data.name, message.data.sessionId, message.data.msg], function (err, rows) {
      if (err) {
        console.log(err);
      }
    });
  };

  var getDrupalStatus = function(callback) {
    var table = config.settings.database_tables['{variable}'];
    drupal.db.query('SELECT value FROM `' + table + '` WHERE name = "vopros_chat_open"', function (err, rows) {
      var status = false;
      if (err) {
        console.log(err);
      }
      else if (rows.length) {
        status = rows[0].value.match(/open/) !== null;
      }

      return callback(status);
    });
  };

  var sendStatus = function(sessionId) {
    getDrupalStatus(function (drupalStatus) {
      var message = {
        'callback': 'voprosChatStatus',
        'open': openStatus && drupalStatus
      };

      // Always use the last known status if explicitly requested.
      if (sessionId) {
        publishMessageToClient(sessionId, message);
      }

      var adminUsers = 0;
      if (config.channels[adminChannel]) {
        adminUsers = hashish(config.channels[adminChannel].sessionIds).length;
      }

      // Open if Drupal is and we have editors connected.
      var status = adminUsers > 0 ? drupalStatus : false;
      message.open = status;

      // Only send update if the status changed.
      if (status !== openStatus) {
        config.io.sockets.json.send(message);
      }

      // Set the new status as the effective.
      openStatus = status;
    });
  };

  process.on('client-message', function (sessionId, message) {
    // Check message type. Prevents the extension from forwarding any message
    // that is not from the vopros_chat module.
    if (message.type === 'vopros_chat') {
      console.log('Vopros Chat extension received a "client-message" event. Action: ' + message.action);
      switch (message.action) {
        // When chat is initialised, user needs to be added to the chat Channel.
      case 'chat_init':

        // Error out if hash in channel name does not validate.
        if (!checkHash(message)) {
          return false;
        }

        addClientToChannel(sessionId, message.channel);

        if (config.channels.hasOwnProperty(message.channel)) {
          config.channels[message.channel].timestamp = timestamp();
        }

        // Notify admins if this is an anonymous user (non-anonymous
        // users are admins).
        var notification = false;
        if (message.data.user.uid === 0) {
          notification = {
            string: 'User joined: @user_name',
            args: {'@user_name': message.data.user.name}
          };
        }

        updateChannelStatus(message.channel, null, true, notification);

        // When entering a chat channel, the client might have sent a message
        // so that users know about this.
        publishMessageToChannel(message);
        break;

        // Leave channel.
      case 'chat_part':
        // nodejs.modules server.js doesn't provide any methods to
        // remove a session from a channel, so we'll have to do it by
        // hand.
        if (config.channels[message.channel]) {
          if (config.channels[message.channel].sessionIds[sessionId]) {
            delete config.channels[message.channel].sessionIds[sessionId];
          }
          updateChannelStatus(message.channel, null);

          // Also publish the message, so other users see the parting.
          publishMessageToChannel(message);
        }
        break;

        // Usual message transmission.
      case 'chat_message':
        if (config.channels.hasOwnProperty(message.channel)) {
          config.channels[message.channel].timestamp = timestamp();
        }
        updateChannelStatus(message.channel);

        publishMessageToChannel(message);
        logMessageToDatabase(message);
        break;

        // Chat status request.
      case 'chat_status':
        sendStatus(sessionId);
        break;
      }
    }

    // Messages for admin status.
    if (message.type === 'vopros_chat_admin') {
      switch (message.action) {
      case 'list_all':
        addClientToChannel(sessionId, adminChannel);
        // Update chat online status, if needed.
        sendStatus();
        var time = timestamp();
        hashish(config.channels).forEach(function(channel, channelId) {
          // Only update channels we have touched.
          if (hashish(channel).has('timestamp')) {
            updateChannelStatus(channelId, time);
          }
        });
        break;

      case 'admin_status':
        addClientToChannel(sessionId, adminChannel);
        // Trigger status update.
        updateAdminStatus();
      }
    }
  });

  process.on('client-disconnect', function (sessionId) {
    // Update status for all channels this connection was part of
    // (should really just be one).

    var updateChannels = [];

    hashish(config.channels).forEach(function (channel, channelId) {
      if (hashish(channel.sessionIds).has(sessionId)) {
        updateChannels.push(channelId);
      }
    });

    // Send the updates after completion of this tick, to give
    // cleanupSocket time to remove the socket from the channels.
    process.nextTick(
      function(channels) {
        var time = timestamp();
        hashish(channels).forEach(function (channel, channelId) {
          if (hashish(channels).has(channelId)) {
            updateChannelStatus(channel, time);
          }
        });
        sendStatus();
      });
  });

  // Sadly, messages originating in Drupal trigger completely
  // different events.
  process.on('message-published', function(message) {
    // Trigger an channel refresh in admin page when chats are closed
    // by Drupal.
    if (message.type === 'vopros_chat' && message.action === 'chat_close') {
      if (config.channels.hasOwnProperty(message.channel)) {
        config.channels[message.channel].timestamp = timestamp();
      }
      updateChannelStatus(message.channel, null, true);
    }
  });
};
