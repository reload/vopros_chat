<?php

/**
 * @file
 * Pages for Vopros Chat.
 */

/**
 * Page callback.
 *
 * Render the chat client.
 */
function vopros_chat_client_page($question_id, $chat_hash) {
  if (vopros_chat_get_channel_hash_from_question_id($question_id) != $chat_hash || !($question = vopros_question_load($question_id))) {
    return drupal_access_denied();
  }

  $options = array(
    'title' => 'Chat',
    'active' => in_array($question->question_status, array('new', 'active')),
  );
  $chat = new VoprosChat(vopros_chat_get_channel_name_from_question_id($question_id), $options);
  return $chat->render();
}

/**
 * Page callback.
 *
 * Render the admin page.
 */
function vopros_chat_admin_page() {
  $build = array(
    '#theme' => 'vopros_chat_admin_page',
    '#attached' => array(
      'css' => array(drupal_get_path('module', 'vopros_chat') . '/css/vopros_chat.admin.css'),
      'js' => array(
        drupal_get_path('module', 'vopros_chat') . '/js/vopros_chat.admin.js',
        // Need to add the client JS so it can add the ajax command we use to
        // initialize the chat after we fetch it over AHAH.
        drupal_get_path('module', 'vopros_chat') . '/js/vopros_chat.js',
        drupal_get_path('module', 'vopros_chat') . '/js/vopros_chat.polyfills.js',
        array(
          'type' => 'setting',
          'data' => array(
            'vopros_chat' => array(
              'admin_signin' => user_access('answer vopros chats'),
              'notification' => array(
                'config' => vopros_chat_notification_config_options(),
                'sound' => url(drupal_get_path('module', 'vopros_chat') . '/sounds/notify'),
                'jsPath' => url(libraries_get_path('notificationjs')),
              ),
            ),
          ),
        ),
      ),
      'library' => array(array('system', 'drupal.ajax')),
      'libraries_load' => array(
        array('autolinker'),
        array('jgrowl'),
        array('playsound'),
        array('notificationjs'),
      ),
    ),
  );

  return $build;
}

/**
 * Ajax page callback.
 *
 * Return the channel listing.
 */
function vopros_chat_channels_js() {
  $commands = array();
  $commands[] = ajax_command_html('#vopros-chat-admin-channel-list', views_embed_view('vopros_chat_question_list'));

  return array('#type' => 'ajax', '#commands' => $commands);
}

/**
 * Ajax page callback.
 *
 * Add a channel to the page.
 */
function vopros_chat_add_chat_js($question) {
  global $user;
  $commands = array();

  // If question is new or active, try to grab a lock and assign the question to
  // the current user.
  if (in_array($question->question_status, array('new', 'active')) && lock_acquire('vopros_chat_question', 5)) {
    $question->question_status = 'assigned';
    $question->question_status_reason = 'locked for answering';
    $question->uid = $user->uid;
    $question->save();
  }

  // Using user name as title.
  $chat = new VoprosChat(vopros_chat_get_channel_name_from_question_id($question->question_id), array('title' => $question->user_name));

  $chat_box = array(
    '#prefix' => '<div id="vopros-chat-admin-' . $question->question_id . '" class="vopros-chat-admin">',
    '#suffix' => '</div>',
  );

  $chat_box['chat'] = array(
    '#markup' => $chat->render(),
  );

  $chat_box['buttons'] = array(
    '#markup' => drupal_render(drupal_get_form('vopros_chat_admin_chat_actions', $question)),
  );

  $commands[] = ajax_command_append('#vopros-chat-admin-chats', drupal_render($chat_box));
  $commands[] = ajax_command_vopros_chat_reinitialize();

  return array('#type' => 'ajax', '#commands' => $commands);
}

/**
 * Creates a Drupal Ajax 'voprosChatReinitialize' command.
 *
 * The 'voprosChatReinitialize' command instructs the client to reinitialize
 * the chats, in order to pick up newly inserted chats.
 *
 * @return array
 *   An array suitable for use with the ajax_render() function.
 */
function ajax_command_vopros_chat_reinitialize() {
  return array(
    'command' => 'voprosChatReinitialize',
  );
}

/**
 * Helper to find configuration options for jGrowl notifications.
 *
 * @return array
 *   An array of configuration options.
 */
function vopros_chat_notification_config_options() {
  $options = variable_get('vopros_chat_notification_config_options', array());
  // Return options and merge in module defaults.
  return $options + array(
    'sticky' => TRUE,
    'closerTemplate' => t('<div>[ close all ]</div>'),
  );
}
