<?php
/**
 * @file
 * vopros_chat.views_default.inc
 */

/**
 * Implements hook_views_default_views().
 */
function vopros_chat_views_default_views() {
  $export = array();

  $view = new view();
  $view->name = 'vopros_chat_question_list';
  $view->description = 'Used to display questions, to find the ones that can/should be answered';
  $view->tag = 'default';
  $view->base_table = 'vopros_question';
  $view->human_name = 'Chat Question list';
  $view->core = 7;
  $view->api_version = '3.0';
  $view->disabled = FALSE; /* Edit this to true to make a default view disabled initially */

  /* Display: Master */
  $handler = $view->new_display('default', 'Master', 'default');
  $handler->display->display_options['title'] = 'Question list';
  $handler->display->display_options['use_ajax'] = TRUE;
  $handler->display->display_options['use_more_always'] = FALSE;
  $handler->display->display_options['access']['type'] = 'perm';
  $handler->display->display_options['access']['perm'] = 'access questions';
  $handler->display->display_options['cache']['type'] = 'none';
  $handler->display->display_options['query']['type'] = 'views_query';
  $handler->display->display_options['query']['options']['query_comment'] = FALSE;
  $handler->display->display_options['exposed_form']['type'] = 'basic';
  $handler->display->display_options['pager']['type'] = 'full';
  $handler->display->display_options['pager']['options']['items_per_page'] = '50';
  $handler->display->display_options['style_plugin'] = 'table';
  $handler->display->display_options['style_options']['columns'] = array(
    'question_id' => 'question_id',
    'question_status_reason' => 'question_status_reason',
    'question_title' => 'question_title',
    'qanda_service_name' => 'qanda_service_name',
    'created' => 'created',
  );
  $handler->display->display_options['style_options']['default'] = '-1';
  $handler->display->display_options['style_options']['info'] = array(
    'question_id' => array(
      'sortable' => 0,
      'default_sort_order' => 'asc',
      'align' => '',
      'separator' => '',
      'empty_column' => 0,
    ),
    'question_status_reason' => array(
      'sortable' => 0,
      'default_sort_order' => 'asc',
      'align' => '',
      'separator' => '',
      'empty_column' => 0,
    ),
    'question_title' => array(
      'sortable' => 0,
      'default_sort_order' => 'asc',
      'align' => '',
      'separator' => '',
      'empty_column' => 0,
    ),
    'qanda_service_name' => array(
      'sortable' => 0,
      'default_sort_order' => 'asc',
      'align' => '',
      'separator' => '',
      'empty_column' => 0,
    ),
    'created' => array(
      'sortable' => 0,
      'default_sort_order' => 'asc',
      'align' => '',
      'separator' => '',
      'empty_column' => 0,
    ),
  );
  /* Footer: Question: Views Count */
  $handler->display->display_options['footer']['views_count']['id'] = 'views_count';
  $handler->display->display_options['footer']['views_count']['table'] = 'vopros_question';
  $handler->display->display_options['footer']['views_count']['field'] = 'views_count';
  /* Relationship: Question: Feedback */
  $handler->display->display_options['relationships']['feedback_question_id']['id'] = 'feedback_question_id';
  $handler->display->display_options['relationships']['feedback_question_id']['table'] = 'vopros_question';
  $handler->display->display_options['relationships']['feedback_question_id']['field'] = 'feedback_question_id';
  /* Field: Question: Question ID */
  $handler->display->display_options['fields']['question_id']['id'] = 'question_id';
  $handler->display->display_options['fields']['question_id']['table'] = 'vopros_question';
  $handler->display->display_options['fields']['question_id']['field'] = 'question_id';
  $handler->display->display_options['fields']['question_id']['exclude'] = TRUE;
  $handler->display->display_options['fields']['question_id']['hide_alter_empty'] = FALSE;
  $handler->display->display_options['fields']['question_id']['separator'] = '';
  /* Field: Question: Question_status_reason */
  $handler->display->display_options['fields']['question_status_reason']['id'] = 'question_status_reason';
  $handler->display->display_options['fields']['question_status_reason']['table'] = 'vopros_question';
  $handler->display->display_options['fields']['question_status_reason']['field'] = 'question_status_reason';
  $handler->display->display_options['fields']['question_status_reason']['exclude'] = TRUE;
  /* Field: Question: Question_title */
  $handler->display->display_options['fields']['question_title']['id'] = 'question_title';
  $handler->display->display_options['fields']['question_title']['table'] = 'vopros_question';
  $handler->display->display_options['fields']['question_title']['field'] = 'question_title';
  $handler->display->display_options['fields']['question_title']['label'] = 'Title';
  $handler->display->display_options['fields']['question_title']['alter']['make_link'] = TRUE;
  $handler->display->display_options['fields']['question_title']['alter']['path'] = 'admin/vopros/questions/[question_id]';
  $handler->display->display_options['fields']['question_title']['hide_alter_empty'] = FALSE;
  /* Field: Question: Qanda_service_name */
  $handler->display->display_options['fields']['qanda_service_name']['id'] = 'qanda_service_name';
  $handler->display->display_options['fields']['qanda_service_name']['table'] = 'vopros_question';
  $handler->display->display_options['fields']['qanda_service_name']['field'] = 'qanda_service_name';
  $handler->display->display_options['fields']['qanda_service_name']['label'] = 'Received from';
  $handler->display->display_options['fields']['qanda_service_name']['element_label_colon'] = FALSE;
  /* Field: Question: Created */
  $handler->display->display_options['fields']['created']['id'] = 'created';
  $handler->display->display_options['fields']['created']['table'] = 'vopros_question';
  $handler->display->display_options['fields']['created']['field'] = 'created';
  $handler->display->display_options['fields']['created']['hide_alter_empty'] = FALSE;
  $handler->display->display_options['fields']['created']['date_format'] = 'short';
  /* Field: Question: Chat status */
  $handler->display->display_options['fields']['chat_status']['id'] = 'chat_status';
  $handler->display->display_options['fields']['chat_status']['table'] = 'vopros_question';
  $handler->display->display_options['fields']['chat_status']['field'] = 'chat_status';
  /* Sort criterion: Question: Created */
  $handler->display->display_options['sorts']['created']['id'] = 'created';
  $handler->display->display_options['sorts']['created']['table'] = 'vopros_question';
  $handler->display->display_options['sorts']['created']['field'] = 'created';
  $handler->display->display_options['sorts']['created']['order'] = 'DESC';
  /* Filter criterion: Question: User_answer_preference */
  $handler->display->display_options['filters']['user_answer_preference']['id'] = 'user_answer_preference';
  $handler->display->display_options['filters']['user_answer_preference']['table'] = 'vopros_question';
  $handler->display->display_options['filters']['user_answer_preference']['field'] = 'user_answer_preference';
  $handler->display->display_options['filters']['user_answer_preference']['value'] = 'chat';
  $handler->display->display_options['filters']['user_answer_preference']['group'] = 1;
  /* Filter criterion: Question: Question_status */
  $handler->display->display_options['filters']['question_status']['id'] = 'question_status';
  $handler->display->display_options['filters']['question_status']['table'] = 'vopros_question';
  $handler->display->display_options['filters']['question_status']['field'] = 'question_status';
  $handler->display->display_options['filters']['question_status']['value'] = array(
    'new' => 'new',
    'active' => 'active',
  );
  $translatables['vopros_chat_question_list'] = array(
    t('Master'),
    t('Question list'),
    t('more'),
    t('Apply'),
    t('Reset'),
    t('Sort by'),
    t('Asc'),
    t('Desc'),
    t('Items per page'),
    t('- All -'),
    t('Offset'),
    t('« first'),
    t('‹ previous'),
    t('next ›'),
    t('last »'),
    t('question'),
    t('Question ID'),
    t('.'),
    t('Question_status_reason'),
    t('Title'),
    t('Received from'),
    t('Created'),
    t('Chat status'),
  );
  $export['vopros_chat_question_list'] = $view;

  return $export;
}
