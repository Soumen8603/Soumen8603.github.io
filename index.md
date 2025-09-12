---
title: Minimal WordPress Plugin
layout: null
---



Building a Minimal WordPress Plugin: CPT + Secure REST + Proper Enqueue
This post shows how to create a WordPress plugin that registers a “Book” custom post type, exposes a secure REST API endpoint with nonce verification, and properly enqueues scripts/styles for a small UI action, tailored for rtCamp’s ASE role.

Problem
Beginners often add scripts directly in templates, skip nonces/capabilities in REST endpoints, or mix unstructured code, which causes maintenance and security issues. This mini‑project builds a clean slice using WordPress best practices that can be run and reviewed quickly.

Environment
WordPress 6.x, PHP 8.x, MySQL 8.x

Local dev using Local/WAMP/XAMPP/wp‑env

Logged‑in user with capability to publish posts

Plugin folder: wp-content/plugins/minimal-books

Step 1: Create the plugin and register the CPT
Create wp-content/plugins/minimal-books/minimal-books.php:

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
Step 2: Enqueue scripts/styles and pass REST settings
Create:

wp-content/plugins/minimal-books/js/app.js

wp-content/plugins/minimal-books/css/app.css

Add to minimal-books.php:

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
css/app.css:

css
#mb-add {
  padding: 8px 12px;
  background: #2271b1;
  color: #fff;
  border: 0;
  border-radius: 4px;
  cursor: pointer;
}
#mb-add:hover { background: #135e96; }
Step 3: Secure REST route with capability and nonce checks
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
Step 4: Front‑end JS to create a Book
Create wp-content/plugins/minimal-books/js/app.js:

``````js
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
