<?php
/**
 * Content model, native (no ACF):
 *  - giac_dish   (CPT) + giac_section (taxonomy, ordered by term ID) + meta: price, note
 *  - giac_review (CPT) + meta: author, rating, source
 *  - Settings > Giacometti: tagline, address, phone, reservation URL, hours
 */

add_action( 'init', function () {
	register_taxonomy( 'giac_section', 'giac_dish', [
		'label' => 'Menu sections', 'public' => false, 'show_ui' => true,
		'hierarchical' => true, 'show_in_rest' => true, 'show_admin_column' => true,
	] );
	register_post_type( 'giac_dish', [
		'label' => 'Menu', 'labels' => [ 'singular_name' => 'Dish' ], 'public' => false, 'show_ui' => true,
		'menu_icon' => 'dashicons-food', 'supports' => [ 'title', 'excerpt' ],
		'taxonomies' => [ 'giac_section' ], 'show_in_rest' => true,
	] );
	register_post_type( 'giac_review', [
		'label' => 'Reviews', 'labels' => [ 'singular_name' => 'Review' ], 'public' => false, 'show_ui' => true,
		'menu_icon' => 'dashicons-format-quote', 'supports' => [ 'title', 'editor' ], 'show_in_rest' => true,
	] );
	foreach ( [ 'giac_dish' => [ 'price', 'note' ], 'giac_review' => [ 'author', 'rating', 'source' ] ] as $pt => $keys ) {
		foreach ( $keys as $k ) {
			register_post_meta( $pt, "giac_$k", [ 'single' => true, 'type' => 'string', 'show_in_rest' => true, 'sanitize_callback' => 'sanitize_text_field' ] );
		}
	}
} );

/* ---- Meta boxes -------------------------------------------------------- */

const GIAC_FIELDS = [
	'giac_dish'   => [ 'price' => 'Price (e.g. 18, or 12 / 24)', 'note' => 'Note (e.g. Végétarien)' ],
	'giac_review' => [ 'author' => 'Author', 'rating' => 'Rating (1-5)', 'source' => 'Source (e.g. Google)' ],
];

add_action( 'add_meta_boxes', function () {
	foreach ( GIAC_FIELDS as $pt => $fields ) {
		add_meta_box( 'giac_fields', 'Details', function ( $post ) use ( $fields ) {
			wp_nonce_field( 'giac_save', 'giac_nonce' );
			foreach ( $fields as $k => $label ) {
				printf( '<p><label>%s<br><input type="text" class="widefat" name="giac_%s" value="%s"></label></p>',
					esc_html( $label ), esc_attr( $k ), esc_attr( get_post_meta( $post->ID, "giac_$k", true ) ) );
			}
		}, $pt );
	}
} );

add_action( 'save_post', function ( $id ) {
	$pt = get_post_type( $id );
	if ( ! isset( GIAC_FIELDS[ $pt ], $_POST['giac_nonce'] ) || ! wp_verify_nonce( $_POST['giac_nonce'], 'giac_save' ) || ! current_user_can( 'edit_post', $id ) ) {
		return;
	}
	foreach ( GIAC_FIELDS[ $pt ] as $k => $_ ) {
		update_post_meta( $id, "giac_$k", sanitize_text_field( wp_unslash( $_POST[ "giac_$k" ] ?? '' ) ) );
	}
} );

/* ---- Site settings (hours, address, CTA) ------------------------------- */

function giac_defaults() {
	return [
		'tagline' => "Cucina italiana, rue de Seine",
		'address' => "Rue de Seine, 75006 Paris",
		'phone'   => '+33 1 00 00 00 00',
		'reserve' => 'mailto:reservation@albertogiacometti.example',
		'hours'   => "Lundi – Vendredi|12:00 – 14:30 · 19:00 – 23:00\nSamedi|12:00 – 15:00 · 19:00 – 23:30\nDimanche|19:00 – 22:30",
	];
}

function giac_opt( $k ) {
	$o = get_option( 'giac_opts', [] );
	return ( isset( $o[ $k ] ) && $o[ $k ] !== '' ) ? $o[ $k ] : giac_defaults()[ $k ];
}

add_action( 'admin_menu', function () {
	add_options_page( 'Giacometti', 'Giacometti', 'manage_options', 'giac', function () {
		echo '<div class="wrap"><h1>Giacometti</h1><form method="post" action="options.php">';
		settings_fields( 'giac' );
		$labels = [ 'tagline' => 'Tagline', 'address' => 'Address', 'phone' => 'Phone', 'reserve' => 'Reservation URL (https:// or mailto:)', 'hours' => 'Hours: one per line, "Day|Hours"' ];
		foreach ( $labels as $k => $l ) {
			printf( '<p><label><strong>%s</strong><br>', esc_html( $l ) );
			if ( $k === 'hours' ) {
				printf( '<textarea class="large-text" rows="6" name="giac_opts[%s]">%s</textarea>', $k, esc_textarea( giac_opt( $k ) ) );
			} else {
				printf( '<input class="large-text" name="giac_opts[%s]" value="%s">', $k, esc_attr( giac_opt( $k ) ) );
			}
			echo '</label></p>';
		}
		submit_button();
		echo '</form></div>';
	} );
} );

add_action( 'admin_init', function () {
	register_setting( 'giac', 'giac_opts', [ 'sanitize_callback' => function ( $in ) {
		$out = [];
		foreach ( (array) $in as $k => $v ) {
			$out[ $k ] = $k === 'hours' ? sanitize_textarea_field( $v ) : ( $k === 'reserve' ? esc_url_raw( $v, [ 'http', 'https', 'mailto', 'tel' ] ) : sanitize_text_field( $v ) );
		}
		return $out;
	} ] );
} );
