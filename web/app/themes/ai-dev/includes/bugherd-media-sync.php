<?php
/**
 * Sync theme-bundled media into the WordPress library (BugHerd task fixes).
 */

add_action('init', 'ai_dev_sync_bugherd_media', 20);

function ai_dev_sync_bugherd_media(): void {
  if (wp_doing_ajax() || wp_doing_cron()) {
    return;
  }

  ai_dev_sync_lego_case_study_thumbnail();
  ai_dev_sync_homepage_forest_panel_image();
  ai_dev_sync_agency_values_list_background();
}

/**
 * LEGO case study (post 342) — homepage case-study-grid primary card.
 * BugHerd task 4: replace grid thumbnail with lego-creative-quests.jpg.
 */
function ai_dev_sync_lego_case_study_thumbnail(): void {
  $sync_version = 'bugherd-task-4-lego-creative-quests';
  $option_key = 'ai_dev_bugherd_media_sync';
  $synced = get_option($option_key, array());

  if (($synced['lego_case_study_thumb'] ?? '') === $sync_version) {
    return;
  }

  $post_id = 342;
  $file = get_template_directory() . '/assets/img/lego-creative-quests.jpg';

  if (!file_exists($file) || !get_post($post_id)) {
    return;
  }

  $attachment_id = ai_dev_import_theme_image($file, 'LEGO Creative Quests case study card');
  if (!$attachment_id) {
    return;
  }

  set_post_thumbnail($post_id, $attachment_id);

  $synced['lego_case_study_thumb'] = $sync_version;
  update_option($option_key, $synced);
}

/**
 * Homepage featured grid forest panel (page 7, items index 7).
 * BugHerd task 5: replace forest SVG placeholder with lego-creative-quests.jpg.
 */
function ai_dev_sync_homepage_forest_panel_image(): void {
  $sync_version = 'bugherd-task-5-forest-panel-lego';
  $option_key = 'ai_dev_bugherd_media_sync';
  $synced = get_option($option_key, array());

  if (($synced['homepage_forest_panel'] ?? '') === $sync_version) {
    return;
  }

  $page_id = 7;
  $file = get_template_directory() . '/assets/img/lego-creative-quests.jpg';
  $page = get_post($page_id);

  if (!file_exists($file) || !$page) {
    return;
  }

  $attachment_id = ai_dev_import_theme_image($file, 'LEGO Creative Quests featured forest panel');
  if (!$attachment_id) {
    return;
  }

  $content = $page->post_content;
  if (!str_contains($content, 'acf/featured-grid')) {
    return;
  }

  $updated = preg_replace(
    '/"items_7_media"\s*:\s*(""|"\d+")/',
    '"items_7_media":' . $attachment_id,
    $content,
    1,
    $count
  );

  if (!$count) {
    return;
  }

  wp_update_post(
    array(
      'ID'           => $page_id,
      'post_content' => $updated,
    )
  );

  $synced['homepage_forest_panel'] = $sync_version;
  update_option($option_key, $synced);
}

/**
 * Agency page (post 9) — "Our values" centered list background.
 * BugHerd task 14: switch centered-list from orange to black brand colour.
 */
function ai_dev_sync_agency_values_list_background(): void {
  $sync_version = 'bugherd-task-14-agency-values-black';
  $option_key = 'ai_dev_bugherd_media_sync';
  $synced = get_option($option_key, array());

  if (($synced['agency_values_list_bg'] ?? '') === $sync_version) {
    return;
  }

  $page_id = 9;
  $page = get_post($page_id);

  if (!$page || !str_contains($page->post_content, 'acf/centered-list')) {
    return;
  }

  $updated = preg_replace(
    '/"background"\s*:\s*"orange"\s*,\s*"_background"\s*:\s*"field_ai_dev_cl_bg"/',
    '"background":"black","_background":"field_ai_dev_cl_bg"',
    $page->post_content,
    1,
    $count
  );

  if (!$count) {
    return;
  }

  wp_update_post(
    array(
      'ID'           => $page_id,
      'post_content' => $updated,
    )
  );

  $synced['agency_values_list_bg'] = $sync_version;
  update_option($option_key, $synced);
}

function ai_dev_import_theme_image(string $file_path, string $title): int {
  require_once ABSPATH . 'wp-admin/includes/file.php';
  require_once ABSPATH . 'wp-admin/includes/media.php';
  require_once ABSPATH . 'wp-admin/includes/image.php';

  $filename = basename($file_path);
  $upload_dir = wp_upload_dir();

  if (!empty($upload_dir['error'])) {
    return 0;
  }

  $dest = $upload_dir['path'] . '/' . wp_unique_filename($upload_dir['path'], $filename);

  if (!copy($file_path, $dest)) {
    return 0;
  }

  $filetype = wp_check_filetype($filename);

  $attachment_id = wp_insert_attachment(
    array(
      'post_mime_type' => $filetype['type'],
      'post_title'     => sanitize_text_field($title),
      'post_content'   => '',
      'post_status'    => 'inherit',
    ),
    $dest
  );

  if (is_wp_error($attachment_id) || !$attachment_id) {
    return 0;
  }

  $metadata = wp_generate_attachment_metadata($attachment_id, $dest);
  wp_update_attachment_metadata($attachment_id, $metadata);

  return (int) $attachment_id;
}
