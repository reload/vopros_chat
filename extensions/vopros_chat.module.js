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

  // Timestamp of last status update.
  var lastStatusTime = 0;

  // Number of active channels.
  var activeChannels = 0;

  // Number of active channels with an admin.
  var activeChannelsWithAdmin = 0;

  var adminChannel = 'vopros_admin_status';

  /**
   * Send status updates to admins.
   */
  var sendAdminStatusUpdate = function(socketId) {
    // No need to do anything if admin channel doesn't exist or is empty.
    if (!config.channels[adminChannel] ||
        hashish(config.channels[adminChannel].sessionIds).length < 1) {
      return;
    }

    var time = (new Date()).getTime();
    var channels = 0;
    var channelsWithAdmins = 0;

    var adminSessionIds = hashish(config.channels[adminChannel].sessionIds).values;

    var adminUsers;

    hashish(config.channels).forEach(function (channel, channelName) {
      // Ignore the admin channel.
      if (channelName === adminChannel) {
        return;
      }

      if (hashish(channel).has('timestamp')) {
        if (hashish(channel.sessionIds).length > 0) {
          channels++;
        }

        adminUsers = hashish(channel.sessionIds).filter(function (sessionId) {
          return hashish(config.channels[adminChannel].sessionIds).has(sessionId);
        }).length;

        if (adminUsers > 1) {
          channelsWithAdmins++;
        }
        // Update status for channel if it's been changed since last
        // run, or a socketId was given
        if (channel.timestamp > lastStatusTime || socketId) {
          // send update for channel.
          var message = {
            'callback': 'voprosChatAdminChannelStatus',
            'channel': adminChannel,
            'channel_name': channelName,
            'users': Object.keys(channel.sessionIds).length,
            'admin_users': adminUsers,
            'timestamp': Math.floor(channel.timestamp / 1000),
            'ref_time': Math.floor(time / 1000),
            'refresh': channel.last_timestamp ? false : true,
            'notification': channel.notification
          };
          channel.last_timestamp = channel.timestamp;

          if (socketId) {
            publishMessageToClient(socketId, message);
          }
          else {
            delete channel.notification;
            publishMessageToChannel(message);
          }
        }
      }
    });

    // General channels/taken channels status.
    if (socketId || activeChannels !== channels || activeChannelsWithAdmin !== channelsWithAdmins) {
      activeChannels = channels;
      activeChannelsWithAdmin = channelsWithAdmins;
      var message = {
        'callback': 'voprosChatAdminStatus',
        'channel': adminChannel,
        'channels': channels,
        'channels_with_admins': channelsWithAdmins
      };

      if (socketId) {
        publishMessageToClient(socketId, message);
      }
      else {
        publishMessageToChannel(message);
      }
    }

    lastStatusTime = time;
  };

  /**
   * Create a database connection.
   */
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

  /**
   * Check that a channel hash is valid.
   */
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

  /**
   * Log a chat message to the Drupal database.
   */
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

  /**
   * Return the open status of Drupal.
   */
  var getDrupalStatus = function(callback) {
    var table = config.settings.database_tables['{variable}'];
    drupal.db.query('SELECT value FROM `' + table + '` WHERE name = "vopros_chat_hours"', function (err, rows) {
      var status = false;
      if (err) {
        console.log(err);
      }
      else if (rows.length) {
        var rx = rows[0].value.match(/^s:\d+:"(.*)";$/);
        var hours;
        if (rx && (hours = JSON.parse(rx[1]))) {
          var time = new Date();
          var today = hours[time.getDay()];
          var minutes = (time.getHours() * 60) + time.getMinutes();
          // If neither of open or close is set, we're closed.
          if (today.open !== null || today.close !== null ) {
            if ((today.open === null || today.open <= minutes) &&
                (today.close === null || today.close > minutes)) {
              status = true;
            }
          }
        }
      }

      return callback(status);
    });
  };

  /**
   * Send simple chat status to admin clients.
   */
  var sendStatus = function(sessionId) {
    getDrupalStatus(function (drupalStatus) {
      var message = {
        'callback': 'voprosChatStatus',
        'open': openStatus && drupalStatus
      };

      // Always use the last known status if explicitly requested.
      if (sessionId) {
        publishMessageToClient(sessionId, message);
        return;
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
          config.channels[message.channel].timestamp = (new Date()).getTime();
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
        config.channels[message.channel].notification = notification;
        sendAdminStatusUpdate();

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
          sendAdminStatusUpdate();

          // Also publish the message, so other users see the parting.
          publishMessageToChannel(message);
        }
        break;

        // Usual message transmission.
      case 'chat_message':
        if (message.channel !== adminChannel) {
          if (config.channels.hasOwnProperty(message.channel)) {
            config.channels[message.channel].timestamp = (new Date()).getTime();
          }
          sendAdminStatusUpdate();
        }

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
        sendAdminStatusUpdate(sessionId);
        break;

      case 'admin_status':
        addClientToChannel(sessionId, adminChannel);
        // Trigger status update.
        sendAdminStatusUpdate(sessionId);
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
        sendStatus();
        sendAdminStatusUpdate();

        // Clean up channels without users.
        hashish(config.channels).forEach(function (channel, channelId) {
          if (hashish(channel).has('timestamp') && hashish(channel.sessionIds).length < 1) {
            delete config.channels[channelId];
          }
        });
      });
  });

  // Sadly, messages originating in Drupal trigger completely
  // different events.
  process.on('message-published', function(message) {
    // Trigger an channel refresh in admin page when chats are closed
    // by Drupal.
    if (message.type === 'vopros_chat' && message.action === 'chat_close') {
      if (config.channels.hasOwnProperty(message.channel)) {
        config.channels[message.channel].timestamp = (new Date()).getTime();
      }
      sendAdminStatusUpdate();
    }
  });
};
