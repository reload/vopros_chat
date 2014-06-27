<?php
/**
 * @file
 * Render chat log items for an activity feed item.
 */
?>
<?php foreach ($variables['log_items']['#log'] as $timestamp => $item): ?>
<div class="vopros-chat-message">
  <div class="message-content">
    <span class="message-author"><?php echo $item->name ?>: </span>
    <span class="message-text"><?php echo $item->msg ?></span>
  </div>
  <span class="message-time"><?php echo format_date($timestamp, 'custom', 'H:i') ?></span>
</div>
<?php endforeach; ?>
