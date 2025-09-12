Minimal WordPress Plugin: CPT + Secure REST + Proper Enqueue

This guide walks through creating a minimal WordPress plugin that:

Registers a Custom Post Type (CPT) for “Books”.

Exposes a secure REST API endpoint with nonce verification.

Properly enqueues assets (scripts & styles) with localized settings.

This mini-project demonstrates best practices and can serve as a quick review-ready slice for rtCamp’s ASE role.

Problem

Beginners often make mistakes such as:

Adding scripts directly in templates.

Skipping nonces and capability checks in REST endpoints.

Mixing unstructured code inside functions.php.

These issues lead to maintenance overhead and security vulnerabilities.

This tutorial fixes that by showing how to build a clean, secure, and minimal plugin.

Environment

WordPress: 6.x

PHP: 8.x

MySQL: 8.x

Local Dev: Local / WAMP / XAMPP / wp-env

Requirements: Logged-in user with publish_posts capability

Plugin folder:

wp-content/plugins/minimal-books

Step 1: Create Plugin and CPT

File: wp-content/plugins/minimal-books/minimal-books.php

```markdown
```php
<?php
/**
 * Plugin Name: Minimal Books
 * Description: Registers a Book CPT and a secure REST endpoint to create books, plus proper asset enqueueing.
 * Version: 0.1.0
 * Author: Your Name
 */
if ( ! defined( 'ABSPATH' ) ) { exit; }

/**
 * Register Book custom post type.
 */
function mb_register_book_cpt() {
    $labels = array(
        'name'          => 'Books',
        'singular_name' => 'Book',
    );
    $args = array(
        'labels'       => $labels,
        'public'       => true,
        'show_in_rest' => true,
        'supports'     => array( 'title', 'editor' ),
        'menu_icon'    => 'dashicons-book',
    );
    register_post_type( 'book', $args );
}
add_action( 'init', 'mb_register_book_cpt' );
```
Step 2: Enqueue Assets & Pass REST Settings

Add this to minimal-books.php:
```php
/**
 * Enqueue front-end assets and pass REST settings + nonce.
 */
function mb_enqueue_assets() {
    $ver = '0.1.0';

    wp_enqueue_style(
        'mb-style',
        plugins_url( 'css/app.css', __FILE__ ),
        array(),
        $ver
    );

    wp_enqueue_script(
        'mb-app',
        plugins_url( 'js/app.js', __FILE__ ),
        array( 'jquery' ),
        $ver,
        true
    );

    // Pass REST root and a nonce for authenticated requests.
    wp_localize_script( 'mb-app', 'mbSettings', array(
        'root'  => esc_url_raw( rest_url( 'mb/v1/' ) ),
        'nonce' => wp_create_nonce( 'wp_rest' ),
    ) );
}
add_action( 'wp_enqueue_scripts', 'mb_enqueue_assets' );
```
```css
css/app.css
#mb-add {
  padding: 8px 12px;
  background: #2271b1;
  color: #fff;
  border: 0;
  border-radius: 4px;
  cursor: pointer;
}
#mb-add:hover {
  background: #135e96;
}
```
Step 3: Secure REST Route

Add to minimal-books.php:
```php
/**
 * Register REST route: POST /mb/v1/books
 */
add_action( 'rest_api_init', function () {
    register_rest_route( 'mb/v1', '/books', array(
        'methods'             => 'POST',
        'callback'            => 'mb_create_book',
        'permission_callback' => function () {
            return current_user_can( 'publish_posts' );
        },
    ) );
} );

/**
 * Callback: Create a book with sanitized input and nonce verification.
 *
 * Expects JSON: { "title": "Some Title" }
 */
function mb_create_book( WP_REST_Request $request ) {
    $nonce = $request->get_header( 'X-WP-Nonce' );
    if ( ! wp_verify_nonce( $nonce, 'wp_rest' ) ) {
        return new WP_Error( 'invalid_nonce', 'Invalid nonce.', array( 'status' => 403 ) );
    }

    $title = sanitize_text_field( $request->get_param( 'title' ) ?: '' );
    if ( $title === '' ) {
        return new WP_Error( 'missing_title', 'Title is required.', array( 'status' => 400 ) );
    }

    $post_id = wp_insert_post( array(
        'post_type'   => 'book',
        'post_title'  => $title,
        'post_status' => 'publish',
    ) );

    if ( is_wp_error( $post_id ) ) {
        return new WP_Error( 'insert_failed', 'Failed to insert post.', array( 'status' => 500 ) );
    }

    return new WP_REST_Response( array( 'id' => $post_id ), 201 );
}
```
Step 4: Front-End JavaScript

File: wp-content/plugins/minimal-books/js/app.js
```js
(function ($) {
  $(function () {
    const $btn = $('<button id="mb-add">Add Demo Book</button>');
    $('body').append($btn);

    $btn.on('click', async function () {
      try {
        const res = await fetch(mbSettings.root + 'books', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-WP-Nonce': mbSettings.nonce
          },
          body: JSON.stringify({ title: 'The Art of Testing ' + Date.now() })
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || ('HTTP ' + res.status));
        }

        const data = await res.json();
        alert('Created Book ID: ' + data.id);
      } catch (e) {
        alert('Failed to create book: ' + e.message);
      }
    });
  });
})(jQuery);
```
