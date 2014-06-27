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
function vopros_chat_client_page($chat_id, $chat_hash) {
  $chat = new VoprosChat($chat_id . '_' . $chat_hash, 'Chat');
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
        drupal_get_path('module', 'vopros_chat') . '/vopros_chat.admin.js',
        // Need to add the client JS so it can add the ajax command we use to
        // initialize the chat after we fetch it over AHAH.
        drupal_get_path('module', 'vopros_chat') . '/vopros_chat.js',
      ),
      'library' => array(array('system', 'drupal.ajax')),
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
 * Add a channel to the page..
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
  $chat = new VoprosChat($question->question_id . '_' . vopros_chat_get_channel_hash_from_question_id($question->question_id), $question->user_name);
  $commands[] = ajax_command_append('#vopros-chat-admin-chats', $chat->render());
  $commands[] = ajax_command_vopros_chat_reinitialize();

  return array('#type' => 'ajax', '#commands' => $commands);
}

/**
 * Creates a Drupal Ajax 'vopros_chat_reinitialize' command.
 *
 * The 'vopros_chat_reinitialize' command instructs the client to reinitialize
 * the chats, in order to pick up newly inserted chats.
 *
 * @return
 *   An array suitable for use with the ajax_render() function.
 */
function ajax_command_vopros_chat_reinitialize() {
  return array(
    'command' => 'vopros_chat_reinitialize',
  );
}
