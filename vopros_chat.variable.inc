<?php

/**
 * @file
 * Declare variables implemented by vopros_chat module for use by the variable
 * module (if used).
 */

/**
 * Implements hook_variable_group_info().
 */
function vopros_chat_variable_group_info() {
  $groups = array();

  $groups['vopros_chat'] = array(
    'title' => t('Vopros Chat settings'),
    'description' => t('Vopros Chat settings'),
    'access' => 'administer site configuration',
  );

  return $groups;
}

/**
 * Implements hook_variable_info().
 *
 * Provide more info on variable if variable.module is used.
 */
function vopros_chat_variable_info($options) {
  $variable = array();

  $view = views_get_view('vopros_question_list');
  if (!empty($view) && is_numeric($view->vid)) {
    $effect = t('Will have no effect because Question List is an overridden view.');
  }
  else {
    $effect = t('If you override the Question List view this variable will have no effect.');
  }
  $variable['vopros_chat_filter_question_list'] = array(
    'title' => t('Vopros Chat Filter Question List'),
    'description' => t('Whether to filter chat question out of Question List. !effect', array('!effect' => $effect)),
    'access' => 'administer views',
    'default' => TRUE,
    'type' => 'boolean',
    'group' => 'vopros_chat',
  );

  $options = array();
  $formats = filter_formats();
  foreach ($formats as $format) {
    $options[$format->format] = $format->name;
  }
  $variable['vopros_chat_log_format_id'] = array(
    'title' => t('Vopros Chat Log Format'),
    'description' => t('The format used for displaying chat log entries.'),
    'access' => 'administer filters',
    'default' => filter_default_format(),
    'type' => 'select',
    'options' => $options,
    'group' => 'vopros_chat',
  );

  return $variable;
}

/**
 * Implements hook_variable_update().
 *
 * Invalidate views cache when the filter question list variable is changed.
 */
function vopros_chat_variable_update($name, $value, $old_value, $options) {
  if ($name == 'vopros_chat_filter_question_list' && $value != $old_value) {
    views_invalidate_cache();
  }
}
