<?php
/**
 * @file
 * Render chat log items for an activity feed item.
 */
global $user;
?>
<?php if (!empty($variables['log_items']['#welcome_message'])) : ?>
<div class="vopros-chat-message">
  <div class="message-content">
    <span class="message-text"><?php echo $variables['log_items']['#welcome_message'] ?></span>
  </div>
</div>
<?php endif; ?>
<?php foreach ($variables['log_items']['#log'] as $item): ?>
<div class="vopros-chat-message">
  <div class="message-content">
<?php if ($item->type == VOPROS_CHAT_LOG_MESSAGE): ?>
    <span class="message-author<?php echo ($user->uid == $item->uid) ? ' message-author-me' : '' ?>"><?php echo ($user->uid == $item->uid) ? t('Me') : $item->name ?>: </span>
<?php endif; ?>
    <span class="message-text"><?php echo $item->msg ?></span>
  </div>
  <span class="message-time"><?php echo format_date($item->timestamp, 'custom', 'G:i') ?></span>
</div>
<?php endforeach; ?>
