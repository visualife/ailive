<?php
/**
 * Giacometti theme bootstrap.
 */
define( 'GIAC_V', '1.0.0' );

require __DIR__ . '/inc/data.php';
require __DIR__ . '/inc/seed.php';

// Compress HTML when the host doesn't (Studio's local server doesn't; most prod hosts already do).
if ( ! is_admin() && ! wp_doing_ajax() && ! defined( 'WP_CLI' ) && extension_loaded( 'zlib' ) && ! ini_get( 'zlib.output_compression' ) && ! headers_sent() ) {
	ob_start( 'ob_gzhandler' );
}

add_action( 'after_setup_theme', function () {
	add_theme_support( 'title-tag' );
	add_theme_support( 'post-thumbnails' );
	add_theme_support( 'html5', [ 'style', 'script' ] );
} );

add_action( 'wp_enqueue_scripts', function () {
	$u = get_theme_file_uri( 'assets/' );
	// Core block CSS is unused on this front end: keep the critical path small.
	wp_dequeue_style( 'wp-block-library' );
	wp_dequeue_style( 'global-styles' );
	wp_dequeue_style( 'classic-theme-styles' );

	// ~10 KB: inlined to remove the render-blocking request (font URLs made absolute).
	wp_register_style( 'giac', false );
	wp_enqueue_style( 'giac' );
	wp_add_inline_style( 'giac', str_replace( '../fonts/', $u . 'fonts/', file_get_contents( get_theme_file_path( 'assets/css/main.css' ) ) ) );
	$defer = [ 'strategy' => 'defer', 'in_footer' => true ];
	wp_enqueue_script( 'giac-gsap', $u . 'js/gsap.min.js', [], '3.15.0', $defer );
	wp_enqueue_script( 'giac-st', $u . 'js/ScrollTrigger.min.js', [ 'giac-gsap' ], '3.15.0', $defer );
	wp_enqueue_script( 'giac-lenis', $u . 'js/lenis.min.js', [], '1.3.26', $defer );
	wp_enqueue_script( 'giac-main', $u . 'js/main.js', [ 'giac-st', 'giac-lenis' ], GIAC_V, $defer );
} );

// Preload the two fonts used above the fold.
add_action( 'wp_head', function () {
	// Only the headline face is on the LCP path; body text can swap in.
	printf( '<link rel="preload" href="%s" as="font" type="font/woff2" crossorigin>' . "\n", esc_url( get_theme_file_uri( 'assets/fonts/bodoni-moda-latin-wght-normal.woff2' ) ) );
	if ( is_front_page() ) {
		echo '<meta name="description" content="Alberto Giacometti, restaurant italien haut de gamme rue de Seine, Paris 6e. Carte, salon privé, réservation.">' . "\n";
	}
}, 1 );

// Strip emoji + embed scripts (not used).
remove_action( 'wp_head', 'print_emoji_detection_script', 7 );
remove_action( 'wp_print_styles', 'print_emoji_styles' );
remove_action( 'wp_head', 'wp_oembed_add_discovery_links' );
remove_action( 'wp_head', 'wp_generator' );
