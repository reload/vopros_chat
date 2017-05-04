/**
 * @file
 * vopros_chat.module.js
 *
 * Node JS Chat Server extension.
 */

/* global exports */
'use strict';

var crypto = require('crypto'),
    drupal = require('drupal'),
    hashish = require('hashish');

var voprosChat = {};

// Global open/closed status for the chat.
var openStatus = false;

// Timestamp of last status update.
var lastStatusTime = 0;

// Number of channels with users but no admins.
var clientsInQueue = 0;

// Channel for channel updates.
var adminChannel = 'vopros_admin_status';

// Channel for overall status updates.
var statusChannel = 'vopros_status';

// Val from setInterval().
var ticker;

// Keep track of the names of the user from sockets.
var nicks = {};

var LOG_TYPE_MESSAGE = 1;
var LOG_TYPE_JOINPART = 2;

/**
 * Ensure object quacks like a user.
 */
var safeUser = function (user) {
  if (typeof user.name === 'undefined') {
    user.name = 'unknown';
  }
  if (typeof user.uid === 'undefined') {
    user.uid = 0;
  }
  if (typeof user.sessionId === 'undefined') {
    user.sessionId = '';
  }
  return user;
};

/**
 * Send status updates to admins.
 */
var sendAdminStatusUpdate = function (clientManager, socketId) {
  var time = (new Date()).getTime();
  var channels = 0;
  var channelsWithAdmins = 0;

  var inQueue = 0;
  var adminUsers = 0;

  hashish(clientManager.channels).forEach(function (channel, channelName) {
    // Ignore the admin channel.
    if (channelName === adminChannel) {
      return;
    }

    if (hashish(channel).has('timestamp')) {
      if (clientManager.checkChannel(adminChannel)) {
        adminUsers = hashish(channel.sessionIds).filter(function (sessionId) {
          return hashish(clientManager.channels[adminChannel].sessionIds).has(sessionId);
        }).length;
      }

      if (hashish(channel.sessionIds).length > 0) {
        channels++;
        if (adminUsers < 1) {
          inQueue++;
        }
      }

      // Only send channel status updates when there's anyone listening.
      if (clientManager.checkChannel(statusChannel) &&
          hashish(clientManager.channels[statusChannel].sessionIds).length > 0) {

        // Update status for channel if it's been changed since last
        // run, or a socketId was given.
        if (channel.timestamp > lastStatusTime || socketId) {
          // Send update for channel.
          var message = {
            'callback': 'voprosChatAdminChannelStatus',
            'channel': statusChannel,
            'channel_name': channelName,
            'users': Object.keys(channel.sessionIds).length,
            'admin_users': adminUsers,
            'timestamp': Math.floor(channel.timestamp / 1000),
            'user_part_timestamp': channel.user_part_timestamp ? Math.floor(channel.user_part_timestamp / 1000) : 0,
            'ref_time': Math.floor(time / 1000),
            'refresh': channel.last_timestamp ? false : true,
            'notification': channel.notification
          };
          channel.last_timestamp = channel.timestamp;

          if (socketId) {
            clientManager.publishMessageToClient(socketId, message);
          }
          else {
            delete channel.notification;
            clientManager.publishMessageToChannel(message);
          }
        }
      }
    }
  });

  // Only send general status updates when there's anyone listening.
  if (clientManager.checkChannel(statusChannel) &&
      hashish(clientManager.channels[statusChannel].sessionIds).length > 0) {
    // General channels/taken channels status.
    if (socketId || inQueue !== clientsInQueue) {
      clientsInQueue = inQueue;

      var message = {
        'callback': 'voprosChatAdminStatus',
        'channel': statusChannel,
        'queue': inQueue
      };

      if (socketId) {
        clientManager.publishMessageToClient(socketId, message);
      }
      else {
        clientManager.publishMessageToChannel(message);
      }
    }
  }

  lastStatusTime = time;
};

/**
 * Create a database connection.
 */
var connectToDatabase = function (config) {
  // Filter out empty values, and extract only the ones we need.
  var options = hashish(config.database)
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

/**
 * Check that a channel hash is valid.
 */
var checkHash = function (clientManager, message) {
  // First compare hash value of question id.
  var questionId = message.join_channel.split('__')[1].split('_')[0];
  var questionHashFromUrl = message.join_channel.split('__')[1].split('_')[1];
  var questionHashCalculated = crypto
      .createHash('sha256')
      .update(clientManager.settings.serviceKey + questionId)
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
var logMessageToDatabase = function (clientManager, type, message) {
  var questionId = message.channel.split('__')[1].split('_')[0];
  var table = clientManager.settings.database_tables['{vopros_chat_log}'];
  var timestamp = Math.floor(Date.now() / 1000);
  var user = safeUser(message.data.user);
  drupal.db.query('INSERT INTO `' + table + '` (timestamp, question_id, uid, name, session_id, msg, type) VALUES (?, ?, ?, ?, ?, ?, ?)', [timestamp, questionId, user.uid, user.name, user.sessionId, message.data.msg, type], function (err, rows) {
    if (err) {
      console.log(err);
    }
  });
};

/**
 * Return the open status of Drupal.
 */
var getDrupalStatus = function (clientManager, callback) {
  var table = clientManager.settings.database_tables['{variable}'];
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
        var day = time.getDay();
        if (day === 0) {
          // Drupal calls Sunday day number 7.
          day = 7;
        }
        var today = hours[day];
        var minutes = (time.getHours() * 60) + time.getMinutes();
        // If neither of open or close is set, we're closed.
        if (today.open !== null || today.close !== null) {
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
 * Send simple chat status to clients.
 */
var sendStatus = function (clientManager, sessionId) {
  getDrupalStatus(clientManager, function (drupalStatus) {
    var message = {
      'callback': 'voprosChatStatus',
      'open': openStatus && drupalStatus,
      'drupal_open': drupalStatus
    };

    // Always use the last known status if explicitly requested.
    if (sessionId) {
      clientManager.publishMessageToClient(sessionId, message);
      return;
    }

    var adminUsers = 0;
    if (clientManager.checkChannel(adminChannel)) {
      adminUsers = hashish(clientManager.channels[adminChannel].sessionIds).length;
    }

    // Open if Drupal is and we have editors connected.
    var status = adminUsers > 0 ? drupalStatus : false;
    message.open = status;

    // Only broadcast update if the status changed. Everyone will get this.
    if (status !== openStatus) {
      clientManager.broadcastMessage(message);
    }

    // Set the new status as the effective.
    openStatus = status;
  });
};

/**
 * Heartbeat.
 *
 * Periodically checks whether the chat is open.
 */
var heartbeat = function (clientManager) {
  if (clientManager.getSocketCount() > 0) {
    sendStatus(clientManager);
  }
  else {
    clearInterval(ticker);
    ticker = null;
  }
};

var messageHandlers = {
  'chat_init': function (clientManager, sessionId, message) {
    // When chat is initialised, user needs to be added to the chat Channel.
    // Error out if hash in channel name does not validate.
    if (!checkHash(clientManager, message)) {
      return false;
    }

    // Note user for later.
    nicks[sessionId] = safeUser(message.data.user);

    // addClientToChannel ensures that the channel exists.
    clientManager.addClientToChannel(sessionId, message.join_channel);
    var channel = clientManager.channels[message.join_channel];

    channel.timestamp = (new Date()).getTime();

    // Notify admins if this is an anonymous user (non-anonymous
    // users are admins).
    var notification = false;
    if (message.data.user.uid === 0) {
      notification = {
        string: 'User joined: @user_name',
        args: {'@user_name': message.data.user.name}
      };
    }
    channel.notification = notification;
    sendAdminStatusUpdate(clientManager);

    // When entering a chat channel, the client might have sent a message
    // so that users know about this.
    message.channel = message.join_channel;
    clientManager.publishMessageToChannel(message);
    logMessageToDatabase(clientManager, LOG_TYPE_JOINPART, message);
  },
  'chat_part': function (clientManager, sessionId, message) {
    // Leave channel.
    if (clientManager.checkChannel(message.channel)) {
      var channel = clientManager.channels[message.channel];
      clientManager.removeClientFromChannel(sessionId, message.channel);
      // Touch channel for status update.
      clientManager.channels[message.channel].timestamp = (new Date()).getTime();

      sendAdminStatusUpdate(clientManager);

      // Also publish the message, so other users see the parting.
      publishMessageToChannel(message);
      logMessageToDatabase(clientManager, LOG_TYPE_JOINPART, message);
    }
  },
  'chat_message': function (clientManager, sessionId, message) {
    // Usual message transmission.
    if (message.channel !== adminChannel &&
        message.channel !== statusChannel) {
      if (clientManager.checkChannel(message.channel)) {
        clientManager.channels[message.channel].timestamp = (new Date()).getTime();
      }
      sendAdminStatusUpdate(clientManager);
    }

    clientManager.publishMessageToChannel(message);
    logMessageToDatabase(clientManager, LOG_TYPE_MESSAGE, message);

  },
  'chat_status': function (clientManager, sessionId, message) {
    sendStatus(clientManager, sessionId);
  },
  'chat_close': function (clientManager, sessionId, message) {
    // Trigger an channel refresh in admin page when chats are closed
    // by Drupal.
    if (clientManager.checkChannel(message.channel)) {
      var channel = clientManager.channels[message.channel];
      channel.timestamp = (new Date()).getTime();
      // The lack of last_timestamp triggers a channel refresh by
      // sendadminstatusupdate().
      delete channel.last_timestamp;
      // Boot all users from the channel. This ensures that they're
      // not counted as in queue.
      hashish(channel.sessionIds).forEach(function (sessionId) {
        clientManager.removeClientFromChannel(sessionId, message.channel)
      })
    }
    sendAdminStatusUpdate(clientManager);
  }
};

var adminMessageHandlers = {
  'admin_signin': function (clientManager, sessionId, message) {
    clientManager.addClientToChannel(sessionId, adminChannel);
  },
  'list_all': function (clientManager, sessionId, message) {
    clientManager.addClientToChannel(sessionId, statusChannel);
    // Update chat online status, if needed.
    sendStatus(clientManager);
    sendAdminStatusUpdate(clientManager, sessionId);
  },
  'admin_status': function (clientManager, sessionId, message) {
    clientManager.addClientToChannel(sessionId, statusChannel);
    // Trigger status update.
    sendAdminStatusUpdate(clientManager, sessionId);
}
};

voprosChat.handleMessage = function (clientManager, sessionId, message) {
  var handlers;
  if (message.type === 'vopros_chat') {
    handlers = messageHandlers;
  }
  if (message.type === 'vopros_chat_admin') {
    handlers = adminMessageHandlers;
  }
  console.log('Vopros Chat extension received a mssage event. Action: ' + message.action);

  if (typeof handlers !== 'undefined') {
    if (typeof handlers[message.action] !== 'undefined') {
      handlers[message.action](clientManager, sessionId, message);
    }
    else {
      console.log('Unknown message type: ' + message.type);
    }
  }
}

voprosChat.setup = function (clientManager) {
  // Open database connection.
  clientManager.settings.debug = true;
  // clientManager.settings.clientsCanWriteToClients = true;
  connectToDatabase(clientManager.settings);

  // Monkey patch channelIsClientWritable to make channels writable.
  // https://github.com/beejeebus/drupal-nodejs/issues/24
  // https://www.drupal.org/node/2288885
  clientManager.channelIsClientWritable = function (channel) {return true;};

  process.on('client-to-channel-message', function (sessionId, message) {
    if (clientManager.checkChannel(message.channel)) {
      clientManager.channels[message.channel].isClientWritable = true;
    }
    if (!ticker) {
      // Update chat status every 30 seconds when someone is online.
      ticker = setInterval(function () {
        heartbeat(clientManager);
      }, 30000);
    }
    voprosChat.handleMessage(clientManager, sessionId, message);
  });

  process.on('client-to-client-message', function (sessionId, message) {
    voprosChat.handleMessage(clientManager, sessionId, message);
  });

  // Messages originating in Drupal trigger a completely different
  // event.
  process.on('message-published', function (message) {
    voprosChat.handleMessage(clientManager, sessionId, message);
  });

  process.on('client-disconnect', function (sessionId) {
    // Update status for all channels this connection was part of
    // (should really just be one).
    hashish(clientManager.channels).forEach(function (channel, channelId) {
      if (clientManager.clientIsInChannel(sessionId, channelId)) {
        channel.timestamp = (new Date()).getTime();

        if (nicks[sessionId]) {
          // Note last part of non-admin users.
          if (nicks[sessionId].uid === 0) {
            channel.user_part_timestamp = (new Date()).getTime();
          }

          // Send part message to channel.
          var msg = {
            type: 'vopros_chat',
            action: 'chat_part',
            channel: channelId,
            callback: 'voprosChatUserOfflineHandler',
            data: {
              user: nicks[sessionId],
              msg: nicks[sessionId].name + ' left'
            }
          };
          clientManager.publishMessageToChannel(msg);
        }
      }
    });

    // Send the updates after completion of this tick, to give
    // cleanupSocket time to remove the socket from the channels.
    process.nextTick(
      function () {
        sendStatus(clientManager);
        sendAdminStatusUpdate(clientManager);

        // Clean up channels without users after a timeout.
        hashish(clientManager.channels).forEach(function (channel, channelId) {
          if (hashish(channel).has('timestamp') &&
              hashish(channel.sessionIds).length < 1 &&
              // Ten second grace period to allow for reconnection.
              channel.timestamp < ((new Date()).getTime() - 10)
             ) {
            clientManager.removeChannel(channelId);
          }
        });
      });
  });
}

module.exports = voprosChat;
