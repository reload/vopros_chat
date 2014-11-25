<?php
/**
 * @file
 * Administrative pages for vopros_chat.
 */

/**
 * Form callback.
 *
 * Settings form.
 */
function vopros_chat_setting_form($form, &$form_state) {
  $form['vopros_chat_hours'] = array(
    '#title' => t('Opening hours'),
    '#theme' => 'vopros_chat_admin_hours',
    '#theme_wrappers' => array('form_element'),
    '#description' => t('Opening and closing hours for each day of the week, in the format HH:MM. If both opening and closing hours is unset for a given day, the chat is closed on that day.'),
    '#tree' => TRUE,
  );

  $days = array(
    t('Monday'),
    t('Tuesday'),
    t('Wednesday'),
    t('Thursday'),
    t('Friday'),
    t('Saturday'),
    t('Sunday'),
  );

  $form['vopros_chat_hours']['open'] = array(
    '#theme_wrappers' => array('form_element'),
    '#title' => t('Opens'),
  );

  $form['vopros_chat_hours']['close'] = array(
    '#theme_wrappers' => array('form_element'),
    '#title' => t('Closes'),
  );

  // Saved as JSON in the variable, so that the JS server can parse it.
  // Note that monday = 1.
  $hours = json_decode(variable_get('vopros_chat_hours', ''), TRUE);
  foreach ($days as $day_num => $name) {
    $day_num += 1;
    foreach (array('open', 'close') as $state) {
      $default_value = isset($hours[$day_num][$state]) ?
        floor($hours[$day_num][$state] / 60) . ':' .
        sprintf("%02d", $hours[$day_num][$state] % 60) :
        '';
      $form['vopros_chat_hours'][$state][$day_num] = array(
        '#type' => 'textfield',
        '#title' => $name,
        '#default_value' => $default_value,
        '#size' => 5,
        '#maxlength' => 5,
      );
    }
  }

  $form['vopros_chat_closed_message'] = array(
    '#type' => 'textfield',
    '#titel' => t('Closed message'),
    '#description' => t('Text shown when the chat is closed.'),
    '#default_value' => variable_get('vopros_chat_closed_message', 'Chat closed.'),
  );

  $form['vopros_chat_busy_message'] = array(
    '#type' => 'textfield',
    '#titel' => t('Busy message'),
    '#description' => t('Text shown when the chat is busy.'),
    '#default_value' => variable_get('vopros_chat_busy_message', 'Chat busy.'),
  );

  $form['vopros_chat_closing_message'] = array(
    '#type' => 'textarea',
    '#title' => t('Close message'),
    '#description' => t('Message sendt to the user when the editor closes the chat.'),
    '#default_value' => variable_get('vopros_chat_closing_message', 'Chat closed'),
  );

  $form['vopros_chat_welcome_message'] = array(
    '#type' => 'textarea',
    '#title' => t('Welcome message'),
    '#description' => t('First message to the user when starting the chat.'),
    '#default_value' => variable_get('vopros_chat_welcome_message', 'Welcome. Please wait.'),
  );

  $form['vopros_chat_standard_messages'] = array(
    '#type' => 'textarea',
    '#title' => t('Standard messages'),
    '#description' => t('Standard messages in group|title|message format. Group can be left out.'),
    '#default_value' => variable_get('vopros_chat_standard_messages', ''),
  );

  return system_settings_form($form);
}

/**
 * Validation for the settings form.
 */
function vopros_chat_setting_form_validate($form, &$form_state) {
  $hours = array();
  // Re-order the vopros_chat_hours variable to a format easier to work with.
  for ($day = 1; $day < 8; $day++) {
    foreach (array('open', 'close') as $state) {
      $value = $form_state['values']['vopros_chat_hours'][$state][$day];
      if (empty($value)) {
        $value = NULL;
      }
      elseif (preg_match('/^(\d{1,2}):(\d{2})$/', $value, $rx)) {
        // Save time as minutes past midnight.
        $value = ($rx[1] * 60) + $rx[2];
      }
      else {
        form_error($form['vopros_chat_hours'][$state][$day], t('Invalid time.'));
      }
      $hours[$day][$state] = $value;
    }
  }

  form_set_value($form['vopros_chat_hours'], json_encode($hours), $form_state);
}

/**
 * Renders the opening hours into a table.
 */
function theme_vopros_chat_admin_hours($variables) {
  $rows = array();
  foreach (element_children($variables['elements']) as $state) {
    $row = array();
    $header = array('');
    foreach (element_children($variables['elements'][$state]) as $key) {
      // Copy the label to the header. This avoids having to duplicate the
      // days.
      $header[] = $variables['elements'][$state][$key]['#title'];
      $variables['elements'][$state][$key]['#title_display'] = 'invisible';
      $row[] = drupal_render($variables['elements'][$state][$key]);
    }

    // Prepend the row header, now that the #children of the element has been
    // printed.
    array_unshift($row, drupal_render($variables['elements'][$state]));
    $rows[] = $row;
  }

  return theme('table', array('header' => $header, 'rows' => $rows));
}
