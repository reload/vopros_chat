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
