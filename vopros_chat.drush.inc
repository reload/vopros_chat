<?php

/**
 * @file
 * Drush commands for the Vopros chat module.
 */

/**
 * Implements hook_drush_command().
 */
function vopros_chat_drush_command() {
  $items = array();

  $items['vopros-chat-start'] = array(
    'description' => 'Start Vopros chat server.',
    'bootstrap' => DRUSH_BOOTSTRAP_DRUPAL,
    'options' => array(
      'node-debug' => 'Show debugging output.',
    ),
  );

  $items['vopros-chat-stop'] = array(
    'description' => 'Stop Vopros chat server, when started with --daemon.',
    'bootstrap' => DRUSH_BOOTSTRAP_DRUPAL,
  );

  $items['vopros-chat-package-json'] = array(
    'description' => 'Generate Vopros chat package.json.',
    'bootstrap' => DRUSH_BOOTSTRAP_DRUPAL,
  );

  return $items;
}

/**
 * Command callback for starting server.
 */
function drush_vopros_chat_start() {
  _vopros_chat_start_stop_server(TRUE, 'drush_shell_exec_interactive', drush_get_option('node-debug', FALSE));
}

/**
 * Command callback for stopping server.
 */
function drush_vopros_chat_stop() {
  _vopros_chat_start_stop_server(FALSE, 'drush_shell_exec_interactive');
}

/**
 * Command callback for generating package.json.
 */
function drush_vopros_chat_package_json() {
  $vopros_chat_path = getcwd() . '/' . drupal_get_path('module', 'vopros_chat');
  $info = drupal_parse_info_file($vopros_chat_path . '/vopros_chat.info');

  $package_json = array(
    'name' => 'Vopros_Chat',
    'homepage' => 'https://github.com/vopros-dk/vopros_chat',
    'description' => $info['description'],
    'version' => preg_replace('/x-/', '', $info['version']),
    'dependencies' => array(
      'drupal' => '0.5.2',
      'hashish' => '0.0.4',
      'sync-exec' => '0.3.2',
    ),
  );

  file_put_contents($vopros_chat_path . '/server/package.json', drupal_json_encode($package_json));
}
