<?php
/**
 * Theme utilities.
 */

/**
 * Whether the theme is running on WP Engine (not local WPE stubs).
 */
function ai_dev_is_wpe_host(): bool {
  $host = $_SERVER['HTTP_HOST'] ?? '';

  if (is_string($host) && $host !== ''
    && !str_contains($host, 'ssl.localhost')
    && !preg_match('/(^|\.)localhost(?::\d+)?$/', $host)) {
    return true;
  }

  if (defined('PWP_NAME') && !in_array(PWP_NAME, array('auto-build-test-local', 'binder-local'), true)) {
    return true;
  }

  return is_string($host) && $host !== '' && preg_match('/(^|\\.)wpengine(powered)?\\.com$/i', $host);
}

/**
 * Site home URL without Bedrock /wp suffix on WP Engine.
 */
function ai_dev_public_home(): string {
  if (ai_dev_is_wpe_host()) {
    $scheme = (is_ssl() || (!empty($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https')) ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'] ?? '';

    return $scheme . '://' . $host;
  }

  return defined('WP_HOME') ? rtrim(WP_HOME, '/') : '';
}

/**
 * Public URI for the active theme.
 */
function ai_dev_theme_uri(): string {
  if (ai_dev_is_wpe_host()) {
    return ai_dev_public_home() . '/wp-content/themes/' . get_stylesheet();
  }

  return content_url('themes/' . get_stylesheet());
}

/**
 * Rewrite legacy Bedrock /wp/wp-content and /app paths for public asset URLs.
 */
function ai_dev_fix_wpe_url(string $url): string {
  if (function_exists('bedrock_wpe_fix_url')) {
    return bedrock_wpe_fix_url($url);
  }

  if (!ai_dev_is_wpe_host()) {
    return $url;
  }

  $home = ai_dev_public_home();
  $search = array(
    '/wp/wp-content/',
    '/wp/wp-includes/',
    '/wp/wp-admin/',
    '/wp/wp-login.php',
    '/app/',
  );
  $replace = array(
    '/wp-content/',
    '/wp-includes/',
    '/wp-admin/',
    '/wp-login.php',
    '/wp-content/',
  );

  if ($home !== '') {
    $absolute_search = array();
    $absolute_replace = array();

    foreach ($search as $index => $path) {
      $absolute_search[] = $home . $path;
      $absolute_replace[] = $home . $replace[$index];
    }

    $search = array_merge($search, $absolute_search);
    $replace = array_merge($replace, $absolute_replace);
  }

  return str_replace($search, $replace, $url);
}

/**
 * Decode JSON-style \uXXXX (or broken uXXXX) unicode escapes in CMS strings.
 */
function ai_dev_decode_json_unicode_escapes(string $value): string {
  if ($value === '' || !preg_match('/(?:\\\\u[0-9a-fA-F]{4}|(?<!\\\\)u[0-9a-fA-F]{4})/', $value)) {
    return $value;
  }

  return preg_replace_callback(
    '/\\\\u([0-9a-fA-F]{4})|(?<!\\\\)u([0-9a-fA-F]{4})/',
    static function (array $matches): string {
      $hex = $matches[1] !== '' ? $matches[1] : $matches[2];
      $code = hexdec($hex);

      if ($code === 0 || ($code >= 0xD800 && $code <= 0xDFFF)) {
        return $matches[0];
      }

      return mb_chr($code, 'UTF-8');
    },
    $value
  );
}

/**
 * Recursively decode unicode escapes in ACF / nested field values.
 *
 * @param mixed $value
 * @return mixed
 */
function ai_dev_decode_json_unicode_value($value) {
  if (is_string($value)) {
    return ai_dev_decode_json_unicode_escapes($value);
  }

  if (!is_array($value)) {
    return $value;
  }

  foreach ($value as $key => $item) {
    $value[$key] = ai_dev_decode_json_unicode_value($item);
  }

  return $value;
}

/**
 * Build BEM block class string from Gutenberg block data.
 */
function ai_dev_block_classes(string $slug, array $block, array $extra = array()): string {
  $classes = array_merge(array($slug, 'block'), $extra);

  if (!empty($block['align'])) {
    $classes[] = 'block--' . $block['align'] . '-width';
  }
  if (!empty($block['className'])) {
    $classes[] = $block['className'];
  }

  return esc_attr(implode(' ', array_filter($classes)));
}

/**
 * Render block anchor attribute.
 */
function ai_dev_block_anchor(array $block): string {
  if (empty($block['anchor'])) {
    return '';
  }
  return 'id="' . esc_attr($block['anchor']) . '"';
}

/**
 * Whether a block has any populated content fields.
 */
function ai_dev_block_has_content(array $fields): bool {
  foreach ($fields as $value) {
    if (is_array($value) && !empty($value)) {
      return true;
    }
    if (is_string($value) && trim($value) !== '') {
      return true;
    }
    if (is_numeric($value)) {
      return true;
    }
  }
  return false;
}

/**
 * Case study count for Work nav label.
 */
function ai_dev_case_study_count(): int {
  $counts = wp_count_posts('case-study');
  return isset($counts->publish) ? (int) $counts->publish : 0;
}

add_filter('nav_menu_item_title', 'ai_dev_work_menu_count', 10, 4);
function ai_dev_work_menu_count($title, $item, $args, $depth) {
  if ($depth !== 0 || !isset($args->theme_location) || $args->theme_location !== 'primary') {
    return $title;
  }
  if (stripos($title, 'work') === false) {
    return $title;
  }
  $count = ai_dev_case_study_count();
  if ($count > 0) {
    return $title . ' <span class="site-header__work-count">' . esc_html($count) . '</span>';
  }
  return $title;
}
