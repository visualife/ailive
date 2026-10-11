<?php
/**
 * Seed content. PLACEHOLDER menu until the client doc is supplied:
 * edit giac_seed_menu() (section => [ [name, french description, price, note?] ]) and run
 *   studio wp eval 'giac_seed( true );'     (true = wipe + reseed)
 * Runs once automatically on theme activation when the site has no dishes.
 */

function giac_seed_menu() {
	return [
		'Pane' => [
			[ 'Focaccia di Recco', 'Focaccia tiède, huile d’olive de Ligurie, fleur de sel', '6' ],
			[ 'Pane della casa', 'Pain au levain, beurre battu, anchois du Cantabrique', '7' ],
			[ 'Grissini al rosmarino', 'Gressins roulés à la main, romarin', '5', 'Végétarien' ],
		],
		'Antipasti' => [
			[ 'Burrata pugliese', 'Burrata des Pouilles, tomates anciennes, basilic', '19', 'Végétarien' ],
			[ 'Vitello tonnato', 'Veau rosé, crème de thon, câpres de Pantelleria', '21' ],
			[ 'Carpaccio di manzo', 'Bœuf, roquette, copeaux de parmesan 36 mois', '22' ],
			[ 'Polpo e patate', 'Poulpe grillé, pommes de terre fumées, olives taggiasche', '24' ],
		],
		'Pizze' => [
			[ 'Margherita', 'San Marzano, fior di latte, basilic, huile d’olive', '16', 'Végétarien' ],
			[ 'Diavola', 'Salame piccante, mozzarella, miel de piment', '19' ],
			[ 'Tartufata', 'Crème de truffe, champignons, stracciatella', '26', 'Végétarien' ],
			[ 'Burrata e crudo', 'Jambon de Parme 24 mois, burrata, roquette', '24' ],
		],
		'Primi' => [
			[ 'Tagliolini al tartufo', 'Pâtes fraîches, beurre noisette, truffe noire', '34' ],
			[ 'Rigatoni alla carbonara', 'Guanciale, pecorino romano, jaune d’œuf, poivre noir', '24' ],
			[ 'Risotto ai funghi porcini', 'Carnaroli, cèpes, parmesan, persil', '28', 'Végétarien' ],
			[ 'Ravioli del plin', 'Raviolis piémontais, jus de rôti, sauge', '27' ],
		],
		'Secondi' => [
			[ 'Ossobuco alla milanese', 'Jarret de veau braisé, gremolata, safran', '42' ],
			[ 'Branzino al forno', 'Bar de ligne, citron de Sicile, fenouil', '38' ],
			[ 'Costoletta alla Milanese', 'Côte de veau panée, roquette, tomates cerises', '46' ],
			[ 'Tagliata di manzo', 'Entrecôte maturée, roquette, parmesan', '39' ],
		],
		'Contorni' => [
			[ 'Spinaci al burro', 'Épinards, beurre, citron', '9', 'Végétarien' ],
			[ 'Patate arrosto', 'Pommes de terre rôties, romarin, ail', '9', 'Végétarien' ],
			[ 'Insalata verde', 'Salade verte, vinaigrette au vin rouge', '8', 'Végétarien' ],
		],
		'Dolci' => [
			[ 'Tiramisù', 'Mascarpone, café, cacao amer', '12', 'Végétarien' ],
			[ 'Panna cotta', 'Vanille de Tahiti, coulis de fruits rouges', '11', 'Végétarien' ],
			[ 'Cannolo siciliano', 'Ricotta de brebis, pistaches de Bronte, écorces confites', '12', 'Végétarien' ],
			[ 'Affogato', 'Glace fior di latte, espresso, amaretto', '10', 'Végétarien' ],
		],
		'Pranzo e Degustazione' => [
			[ 'Pranzo – Entrée + plat', 'Du lundi au vendredi, midi. Antipasto du jour et primo ou secondo', '29' ],
			[ 'Pranzo – Entrée + plat + dessert', 'Du lundi au vendredi, midi', '35' ],
			[ 'Degustazione – 5 services', 'Menu dégustation du chef, accord mets et vins en option (+ 38)', '98' ],
		],
		'Bevande' => [
			[ 'Spritz Giacometti', 'Aperol, prosecco, orange sanguine', '13' ],
			[ 'Negroni', 'Gin, Campari, vermouth rosso', '15' ],
			[ 'Espresso', 'Torréfaction artisanale', '3' ],
			[ 'Acqua minerale', 'San Pellegrino / Panna, 75 cl', '6' ],
		],
		'Vini pregiati' => [
			[ 'Barolo Riserva', 'Piémont · Nebbiolo · verre / bouteille', '22 / 140' ],
			[ 'Brunello di Montalcino', 'Toscane · Sangiovese · verre / bouteille', '20 / 125' ],
			[ 'Amarone della Valpolicella', 'Vénétie · Corvina · verre / bouteille', '24 / 150' ],
			[ 'Franciacorta Brut', 'Lombardie · Chardonnay · verre / bouteille', '16 / 90' ],
		],
	];
}

function giac_seed_reviews() {
	return [
		[ 'Une salle de théâtre, un risotto aux cèpes inoubliable. Le service est d’une élégance rare.', 'Camille D.', 5, 'Google' ],
		[ 'Les tagliolini à la truffe valent à eux seuls le détour. Ambiance feutrée, presque cinématographique.', 'Julien M.', 5, 'Google' ],
		[ 'Meilleure carte des vins italiens du quartier. Le sommelier a trouvé l’accord parfait.', 'Sophie L.', 5, 'TripAdvisor' ],
		[ 'On se croirait à Rome en 1962. La panna cotta est une merveille.', 'Antoine R.', 5, 'Google' ],
		[ 'Rue de Seine, lumière de bougie, cuisine généreuse et précise. On y retourne.', 'Léa B.', 5, 'TheFork' ],
		[ 'Une adresse pour les grandes occasions. Le salon privé était parfait pour notre dîner.', 'Hugo P.', 5, 'Google' ],
		[ 'L’ossobuco fond en bouche. Accueil chaleureux malgré le complet.', 'Inès C.', 4, 'TripAdvisor' ],
		[ 'Pizza napolitaine au niveau de Naples, et un tiramisù sans reproche.', 'Marco V.', 5, 'Google' ],
	];
}

function giac_seed( $reset = false ) {
	if ( $reset ) {
		$all = get_posts( [ 'post_type' => [ 'giac_dish', 'giac_review' ], 'numberposts' => -1, 'post_status' => 'any', 'fields' => 'ids' ] );
		array_map( fn( $id ) => wp_delete_post( $id, true ), $all );
		foreach ( get_terms( [ 'taxonomy' => 'giac_section', 'hide_empty' => false, 'fields' => 'ids' ] ) as $t ) {
			wp_delete_term( $t, 'giac_section' );
		}
	} elseif ( get_posts( [ 'post_type' => 'giac_dish', 'numberposts' => 1, 'fields' => 'ids' ] ) ) {
		return;
	}
	foreach ( giac_seed_menu() as $section => $dishes ) {
		$term = wp_insert_term( $section, 'giac_section' ); // inserted in order: term_id order = menu order
		foreach ( $dishes as $d ) {
			$id = wp_insert_post( [ 'post_type' => 'giac_dish', 'post_status' => 'publish', 'post_title' => $d[0], 'post_excerpt' => $d[1] ] );
			update_post_meta( $id, 'giac_price', $d[2] );
			update_post_meta( $id, 'giac_note', $d[3] ?? '' );
			wp_set_object_terms( $id, (int) $term['term_id'], 'giac_section' );
		}
	}
	foreach ( giac_seed_reviews() as $r ) {
		$id = wp_insert_post( [ 'post_type' => 'giac_review', 'post_status' => 'publish', 'post_title' => $r[1], 'post_content' => $r[0] ] );
		update_post_meta( $id, 'giac_author', $r[1] );
		update_post_meta( $id, 'giac_rating', (string) $r[2] );
		update_post_meta( $id, 'giac_source', $r[3] );
	}
}

add_action( 'after_switch_theme', fn() => giac_seed() ); // closure: the hook passes the old theme name, which must not hit $reset
