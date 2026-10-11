<?php
/**
 * Single-page showcase: hero, split menu, private dining, review wall, footer CTA.
 */
$roman    = [ 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII' ];
$sections = get_terms( [ 'taxonomy' => 'giac_section', 'orderby' => 'term_id', 'hide_empty' => true ] );
$reviews  = get_posts( [ 'post_type' => 'giac_review', 'numberposts' => 12, 'orderby' => 'ID', 'order' => 'ASC' ] );
$cols     = [ [], [], [] ];
foreach ( $reviews as $i => $r ) {
	$cols[ $i % 3 ][] = $r;
}
$hours   = array_filter( array_map( fn( $l ) => array_pad( explode( '|', $l, 2 ), 2, '' ), preg_split( '/\R/', giac_opt( 'hours' ) ) ), fn( $h ) => trim( $h[0] ) !== '' );
$reserve = giac_opt( 'reserve' );

get_header();
?>

<!-- 1. HERO: scroll-scrubbed door push-in (canvas) -->
<section class="hero" id="hero" aria-label="Alberto Giacometti">
	<div class="hero__pin">
		<canvas id="door" width="1280" height="720" aria-hidden="true"></canvas>
		<div class="hero__text">
			<p class="mono hero__kicker">Paris VIe · Rue de Seine</p>
			<h1 class="hero__logo">Alberto<br><em>Giacometti</em></h1>
			<p class="hero__tag"><?php echo esc_html( giac_opt( 'tagline' ) ); ?></p>
		</div>
		<p class="hero__cue mono">Faites un pas · Défilez</p>
	</div>
</section>

<!-- 2. SPLIT-SCREEN MENU -->
<section class="menu" id="menu" aria-labelledby="menu-title">
	<div class="menu__art" aria-hidden="true">
		<?php foreach ( $sections as $i => $s ) : ?>
			<div class="art art--<?php echo $i % 4; ?><?php echo $i === 0 ? ' is-on' : ''; ?>" data-i="<?php echo (int) $i; ?>">
				<span class="art__num"><?php echo esc_html( $roman[ $i ] ?? $i + 1 ); ?></span>
				<span class="art__name"><?php echo esc_html( $s->name ); ?></span>
			</div>
		<?php endforeach; ?>
	</div>
	<div class="menu__list">
		<header class="menu__head">
			<p class="mono">La carte</p>
			<h2 id="menu-title">Menu</h2>
		</header>
		<?php foreach ( $sections as $i => $s ) : ?>
			<section class="msec" data-i="<?php echo (int) $i; ?>">
				<h3><span class="mono"><?php echo esc_html( $roman[ $i ] ?? $i + 1 ); ?></span> <?php echo esc_html( $s->name ); ?></h3>
				<ul>
					<?php
					$dishes = get_posts( [ 'post_type' => 'giac_dish', 'numberposts' => -1, 'orderby' => 'ID', 'order' => 'ASC',
						'tax_query' => [ [ 'taxonomy' => 'giac_section', 'terms' => $s->term_id ] ] ] );
					foreach ( $dishes as $d ) :
						$note = get_post_meta( $d->ID, 'giac_note', true );
						?>
						<li class="dish">
							<div class="dish__row">
								<span class="dish__name"><?php echo esc_html( $d->post_title ); ?></span>
								<span class="dish__dots" aria-hidden="true"></span>
								<span class="dish__price"><?php echo esc_html( get_post_meta( $d->ID, 'giac_price', true ) ); ?> €</span>
							</div>
							<p class="dish__desc"><?php echo esc_html( $d->post_excerpt ); ?><?php if ( $note ) : ?> <em class="mono"><?php echo esc_html( $note ); ?></em><?php endif; ?></p>
						</li>
					<?php endforeach; ?>
				</ul>
			</section>
		<?php endforeach; ?>
	</div>
</section>

<!-- 3. EXPANDING PRIVATE-DINING CARD -->
<section class="salon" id="salon" aria-labelledby="salon-title">
	<div class="salon__pin">
		<div class="salon__card">
			<div class="salon__inner">
				<p class="mono">Le salon privé</p>
				<h2 id="salon-title">Une table<br><em>à huis clos</em></h2>
				<p class="salon__lead">Derrière une porte capitonnée, une salle de vingt-quatre couverts, une cheminée en marbre et un menu composé avec le chef. Pour les dîners d’affaires, les anniversaires, les longues soirées.</p>
				<dl class="salon__facts mono">
					<div><dt>Capacité</dt><dd>8 à 24 convives</dd></div>
					<div><dt>Menu</dt><dd>Sur mesure</dd></div>
					<div><dt>Service</dt><dd>Sommelier dédié</dd></div>
				</dl>
				<a class="btn" href="<?php echo esc_url( $reserve ); ?>">Demander le salon</a>
			</div>
		</div>
	</div>
</section>

<!-- 4. TILTED 3D REVIEW WALL -->
<section class="wall" id="avis" aria-labelledby="wall-title">
	<header class="wall__head">
		<p class="mono">Ils en parlent</p>
		<h2 id="wall-title">Les <em>avis</em></h2>
	</header>
	<div class="wall__stage">
		<div class="wall__plane">
			<?php foreach ( $cols as $c => $list ) : ?>
				<div class="wall__col" data-c="<?php echo (int) $c; ?>">
					<?php foreach ( $list as $r ) :
						$rate = (int) get_post_meta( $r->ID, 'giac_rating', true );
						?>
						<figure class="rev">
							<div class="rev__stars" role="img" aria-label="<?php echo $rate; ?> sur 5"><?php echo str_repeat( '★', $rate ) . str_repeat( '☆', max( 0, 5 - $rate ) ); ?></div>
							<blockquote><?php echo esc_html( wp_strip_all_tags( $r->post_content ) ); ?></blockquote>
							<figcaption class="mono"><?php echo esc_html( get_post_meta( $r->ID, 'giac_author', true ) ); ?> · <?php echo esc_html( get_post_meta( $r->ID, 'giac_source', true ) ); ?></figcaption>
						</figure>
					<?php endforeach; ?>
				</div>
			<?php endforeach; ?>
		</div>
	</div>
</section>

<!-- 5. NIGHT-STREET FOOTER CTA -->
<section class="night" id="reserver" aria-labelledby="night-title">
	<svg class="night__street" viewBox="0 0 1600 600" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
		<defs>
			<radialGradient id="lamp"><stop offset="0" stop-color="#E0806A" stop-opacity=".55"/><stop offset="1" stop-color="#E0806A" stop-opacity="0"/></radialGradient>
		</defs>
		<g fill="#120609">
			<rect x="0" y="180" width="360" height="420"/><rect x="380" y="120" width="300" height="480"/>
			<rect x="940" y="150" width="320" height="450"/><rect x="1280" y="210" width="320" height="390"/>
		</g>
		<g fill="#C9A86A" class="night__win">
			<rect x="40" y="230" width="34" height="52"/><rect x="110" y="230" width="34" height="52" opacity=".3"/><rect x="180" y="320" width="34" height="52"/><rect x="250" y="230" width="34" height="52" opacity=".5"/>
			<rect x="420" y="180" width="34" height="52" opacity=".4"/><rect x="490" y="180" width="34" height="52"/><rect x="560" y="270" width="34" height="52" opacity=".3"/><rect x="630" y="360" width="34" height="52"/>
			<rect x="980" y="210" width="34" height="52"/><rect x="1050" y="300" width="34" height="52" opacity=".4"/><rect x="1120" y="210" width="34" height="52" opacity=".6"/><rect x="1190" y="300" width="34" height="52"/>
			<rect x="1320" y="270" width="34" height="52" opacity=".5"/><rect x="1400" y="360" width="34" height="52"/><rect x="1480" y="270" width="34" height="52"/>
		</g>
		<rect x="700" y="260" width="220" height="340" fill="#3A0D12"/>
		<rect x="730" y="330" width="160" height="270" fill="#E0806A" opacity=".85" class="night__door"/>
		<circle cx="1180" cy="330" r="190" fill="url(#lamp)" class="night__glow"/>
		<path d="M1180 600V330" stroke="#C9A86A" stroke-width="5"/><circle cx="1180" cy="320" r="12" fill="#F1E8D8"/>
		<rect x="0" y="560" width="1600" height="40" fill="#0B0407"/>
	</svg>
	<div class="night__content">
		<p class="mono">Ce soir, peut-être</p>
		<h2 id="night-title">Réservez<br><em>votre table</em></h2>
		<a class="btn btn--coral" href="<?php echo esc_url( $reserve ); ?>">Réserver</a>
		<div class="night__info">
			<address>
				<p class="mono">Adresse</p>
				<p><?php echo esc_html( giac_opt( 'address' ) ); ?></p>
				<p><a href="tel:<?php echo esc_attr( preg_replace( '/[^+\d]/', '', giac_opt( 'phone' ) ) ); ?>"><?php echo esc_html( giac_opt( 'phone' ) ); ?></a></p>
			</address>
			<div>
				<p class="mono">Horaires</p>
				<table>
					<?php foreach ( $hours as $h ) : ?>
						<tr><th scope="row"><?php echo esc_html( trim( $h[0] ) ); ?></th><td><?php echo esc_html( trim( $h[1] ) ); ?></td></tr>
					<?php endforeach; ?>
				</table>
			</div>
		</div>
		<p class="night__legal mono">© <?php echo esc_html( wp_date( 'Y' ) ); ?> Alberto Giacometti · Site de démonstration</p>
	</div>
</section>

<?php
get_footer();
