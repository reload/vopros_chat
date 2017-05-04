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

var voprosChatExtension = {};

/**
 * Construntor.
 */
function VoprosChat(clientManager) {
  this.clientManager = clientManager;

  // Global open/closed status for the chat.
  this.openStatus = false;

  // Timestamp of last status update.
  this.lastStatusTime = 0;

  // Number of channels with users but no admins.
  this.clientsInQueue = 0;

  // Channel for channel updates.
  this.adminChannel = 'vopros_admin_status';

  // Channel for overall status updates.
  this.statusChannel = 'vopros_status';

  // Val from setInterval().
  this.ticker;

  // Keep track of the names of the user from sockets.
  this.nicks = {};

  this.LOG_TYPE_MESSAGE = 1;
  this.LOG_TYPE_JOINPART = 2;

  // Open database connection.
  this.connectToDatabase(clientManager.settings);

  // Monkey patch channelIsClientWritable to make channels writable.
  // https://github.com/beejeebus/drupal-nodejs/issues/24
  // https://www.drupal.org/node/2288885
  this.clientManager.channelIsClientWritable = function (channel) {return true;};
};

/**
 * Get channel object.
 */
VoprosChat.prototype.getChannel = function (name) {
  if (this.clientManager.checkChannel(name)) {
    return this.clientManager.channels[name];
  }
}

/**
 * Ensure object quacks like a user.
 */
VoprosChat.prototype.safeUser = function (user) {
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
VoprosChat.prototype.sendAdminStatusUpdate = function (socketId) {
  var time = (new Date()).getTime();
  var channels = 0;
  var channelsWithAdmins = 0;

  var inQueue = 0;
  var adminUsers = 0;

  var self = this;
  hashish(this.clientManager.channels).forEach(function (channel, channelName) {
    // Ignore the admin channel.
    if (channelName === self.adminChannel) {
      return;
    }

    if (hashish(channel).has('timestamp')) {
      if (self.clientManager.checkChannel(self.adminChannel)) {
        adminUsers = hashish(channel.sessionIds).filter(function (sessionId) {
          return hashish(self.getChannel(self.adminChannel).sessionIds).has(sessionId);
        }).length;
      }

      if (hashish(channel.sessionIds).length > 0) {
        channels++;
        if (adminUsers < 1) {
          inQueue++;
        }
      }

      // Only send channel status updates when there's anyone listening.
      if (self.clientManager.checkChannel(self.statusChannel) &&
          hashish(self.getChannel(self.statusChannel).sessionIds).length > 0) {

        // Update status for channel if it's been changed since last
        // run, or a socketId was given.
        if (channel.timestamp > self.lastStatusTime || socketId) {
          // Send update for channel.
          var message = {
            'callback': 'voprosChatAdminChannelStatus',
            'channel': self.statusChannel,
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
            self.clientManager.publishMessageToClient(socketId, message);
          }
          else {
            delete channel.notification;
            self.clientManager.publishMessageToChannel(message);
          }
        }
      }
    }
  });

  // Only send general status updates when there's anyone listening.
  if (this.clientManager.checkChannel(this.statusChannel) &&
      hashish(this.getChannel(this.statusChannel).sessionIds).length > 0) {
    // General channels/taken channels status.
    if (socketId || inQueue !== this.clientsInQueue) {
      this.clientsInQueue = inQueue;

      var message = {
        'callback': 'voprosChatAdminStatus',
        'channel': this.statusChannel,
        'queue': inQueue
      };

      if (socketId) {
        this.clientManager.publishMessageToClient(socketId, message);
      }
      else {
        this.clientManager.publishMessageToChannel(message);
      }
    }
  }

  this.lastStatusTime = time;
};

/**
 * Create a database connection.
 */
VoprosChat.prototype.connectToDatabase = function (config) {
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
VoprosChat.prototype.checkHash = function (message) {
  // First compare hash value of question id.
  var questionId = message.join_channel.split('__')[1].split('_')[0];
  var questionHashFromUrl = message.join_channel.split('__')[1].split('_')[1];
  var questionHashCalculated = crypto
      .createHash('sha256')
      .update(this.clientManager.settings.serviceKey + questionId)
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
VoprosChat.prototype.logMessageToDatabase = function (type, message) {
  var questionId = message.channel.split('__')[1].split('_')[0];
  var table = this.clientManager.settings.database_tables['{vopros_chat_log}'];
  var timestamp = Math.floor(Date.now() / 1000);
  var user = this.safeUser(message.data.user);
  drupal.db.query('INSERT INTO `' + table + '` (timestamp, question_id, uid, name, session_id, msg, type) VALUES (?, ?, ?, ?, ?, ?, ?)', [timestamp, questionId, user.uid, user.name, user.sessionId, message.data.msg, type], function (err, rows) {
    if (err) {
      console.log(err);
    }
  });
};

/**
 * Return the open status of Drupal.
 */
VoprosChat.prototype.getDrupalStatus = function (callback) {
  var table = this.clientManager.settings.database_tables['{variable}'];
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
VoprosChat.prototype.sendStatus = function (sessionId) {
  var self = this;
  this.getDrupalStatus(function (drupalStatus) {
    var message = {
      'callback': 'voprosChatStatus',
      'open': self.openStatus && drupalStatus,
      'drupal_open': drupalStatus
    };

    // Always use the last known status if explicitly requested.
    if (sessionId) {
      self.clientManager.publishMessageToClient(sessionId, message);
      return;
    }

    var adminUsers = 0;
    if (self.clientManager.checkChannel(self.adminChannel)) {
      adminUsers = hashish(self.getChannel(self.adminChannel).sessionIds).length;
    }

    // Open if Drupal is and we have editors connected.
    var status = adminUsers > 0 ? drupalStatus : false;
    message.open = status;
    // Only broadcast update if the status changed. Everyone will get this.
    if (status !== self.openStatus) {
      self.clientManager.broadcastMessage(message);
    }

    // Set the new status as the effective.
    self.openStatus = status;
  });
};

/**
 * Heartbeat.
 *
 * Periodically checks whether the chat is open.
 */
VoprosChat.prototype.heartbeat = function () {
  if (this.clientManager.getSocketCount() > 0) {
    this.sendStatus();
  }
  else {
    clearInterval(this.ticker);
    this.ticker = null;
  }
};

/**
 * Handlers for messages.
 */
VoprosChat.prototype.messageHandlers = {
  'chat_init': function (sessionId, message) {
    // When chat is initialised, user needs to be added to the chat Channel.
    // Error out if hash in channel name does not validate.
    if (!this.checkHash(message)) {
      return false;
    }

    // Note user for later.
    this.nicks[sessionId] = this.safeUser(message.data.user);

    // addClientToChannel ensures that the channel exists.
    this.clientManager.addClientToChannel(sessionId, message.join_channel);
    var channel = this.getChannel(message.join_channel);

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
    this.sendAdminStatusUpdate();

    // When entering a chat channel, the client might have sent a message
    // so that users know about this.
    message.channel = message.join_channel;
    this.clientManager.publishMessageToChannel(message);
    this.logMessageToDatabase(this.LOG_TYPE_JOINPART, message);
  },
  'chat_part': function (sessionId, message) {
    // Leave channel.
    if (this.clientManager.checkChannel(message.channel)) {
      var channel = this.getChannel(message.channel);
      this.clientManager.removeClientFromChannel(sessionId, message.channel);
      // Touch channel for status update.
      this.getChannel(message.channel).timestamp = (new Date()).getTime();

      this.sendAdminStatusUpdate();

      // Also publish the message, so other users see the parting.
      this.clientManager.publishMessageToChannel(message);
      this.logMessageToDatabase(this.LOG_TYPE_JOINPART, message);
    }
  },
  'chat_message': function (sessionId, message) {
    // Usual message transmission.
    if (message.channel !== this.adminChannel &&
        message.channel !== this.statusChannel) {
      if (this.clientManager.checkChannel(message.channel)) {
        this.getChannel(message.channel).timestamp = (new Date()).getTime();
      }
      this.sendAdminStatusUpdate();
    }

    this.clientManager.publishMessageToChannel(message);
    this.logMessageToDatabase(this.LOG_TYPE_MESSAGE, message);

  },
  'chat_status': function (sessionId, message) {
    this.sendStatus(sessionId);
  },
  'chat_close': function (sessionId, message) {
    // Trigger an channel refresh in admin page when chats are closed
    // by Drupal.
    if (this.clientManager.checkChannel(message.channel)) {
      var channel = this.getChannel(message.channel);
      channel.timestamp = (new Date()).getTime();
      // The lack of last_timestamp triggers a channel refresh by
      // sendadminstatusupdate().
      delete channel.last_timestamp;
      // Boot all users from the channel. This ensures that they're
      // not counted as in queue.
      hashish(channel.sessionIds).forEach(function (sessionId) {
        this.clientManager.removeClientFromChannel(sessionId, message.channel)
      })
    }
    this.sendAdminStatusUpdate();
  }
};

/**
 * Handlers for admin messages.
 */
VoprosChat.prototype.adminMessageHandlers = {
  'admin_signin': function (sessionId, message) {
    this.clientManager.addClientToChannel(sessionId, this.adminChannel);
  },
  'list_all': function (sessionId, message) {
    this.clientManager.addClientToChannel(sessionId, this.statusChannel);
    // Update chat online status, if needed.
    this.sendStatus();
    this.sendAdminStatusUpdate(sessionId);
  },
  'admin_status': function (sessionId, message) {
    this.clientManager.addClientToChannel(sessionId, this.statusChannel);
    // Trigger status update.
    this.sendAdminStatusUpdate(sessionId);
  }
};

VoprosChat.prototype.handleMessage = function (sessionId, message) {
  var handlers;
  if (message.type === 'vopros_chat') {
    handlers = this.messageHandlers;
  }
  if (message.type === 'vopros_chat_admin') {
    handlers = this.adminMessageHandlers;
  }
  console.log('Vopros Chat extension received a mssage event. Action: ' + message.action);

  if (!this.ticker) {
    // Update chat status every 30 seconds when someone is online.
    this.ticker = setInterval(this.heartbeat.bind(this), 30000);
  }

  if (typeof handlers !== 'undefined') {
    if (typeof handlers[message.action] !== 'undefined') {
      handlers[message.action].apply(this, [sessionId, message]);
    }
    else {
      console.log('Unknown message type: ' + message.type);
    }
  }
};

VoprosChat.prototype.handleDisconnect = function (sessionId) {
  // Update status for all channels this connection was part of
  // (should really just be one).
  var self = this;
  hashish(self.clientManager.channels).forEach(function (channel, channelId) {
    if (self.clientManager.clientIsInChannel(sessionId, channelId)) {
      channel.timestamp = (new Date()).getTime();

      if (self.nicks[sessionId]) {
        // Note last part of non-admin users.
        if (self.nicks[sessionId].uid === 0) {
          channel.user_part_timestamp = (new Date()).getTime();
        }

        // Send part message to channel.
        var msg = {
          type: 'vopros_chat',
          action: 'chat_part',
          channel: channelId,
          callback: 'voprosChatUserOfflineHandler',
          data: {
            user: self.nicks[sessionId],
            msg: self.nicks[sessionId].name + ' left'
          }
        };
        self.clientManager.publishMessageToChannel(msg);
      }
    }
  });

  // Send the updates after completion of this tick, to give
  // cleanupSocket time to remove the socket from the channels.
  process.nextTick(self.delayedUpdate.bind(self));
};

VoprosChat.prototype.delayedUpdate = function () {
  this.sendStatus();
  this.sendAdminStatusUpdate();

  // Clean up channels without users after a timeout.
  var self = this;
  hashish(this.clientManager.channels).forEach(function (channel, channelId) {
    if (hashish(channel).has('timestamp') &&
        hashish(channel.sessionIds).length < 1 &&
        // Ten second grace period to allow for reconnection.
        channel.timestamp < ((new Date()).getTime() - 10)
       ) {
      self.clientManager.removeChannel(channelId);
    }
  });
};

voprosChatExtension.setup = function (clientManager) {

  var voprosChat = new VoprosChat(clientManager);

  process.on('client-to-channel-message', function (sessionId, message) {
    voprosChat.handleMessage(sessionId, message);
  });

  process.on('client-to-client-message', function (sessionId, message) {
    voprosChat.handleMessage(sessionId, message);
  });

  // Messages originating in Drupal trigger a completely different
  // event.
  process.on('message-published', function (message) {
    voprosChat.handleMessage(sessionId, message);
  });

  process.on('client-disconnect', function (sessionId) {
    voprosChat.handleDisconnect(sessionId);
  });
}

module.exports = voprosChatExtension;
