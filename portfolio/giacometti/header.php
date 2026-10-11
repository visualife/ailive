<!doctype html>
<html <?php language_attributes(); ?>>
<head>
<meta charset="<?php bloginfo( 'charset' ); ?>">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#1A0B12">
<?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
<?php wp_body_open(); ?>
<a class="skip" href="#menu">Aller au menu</a>
<header class="nav">
	<a class="nav__logo" href="<?php echo esc_url( home_url( '/' ) ); ?>">A. Giacometti</a>
	<nav class="nav__links mono" aria-label="Navigation principale">
		<a href="#menu">Menu</a>
		<a href="#salon">Salon privé</a>
		<a href="#avis">Avis</a>
		<a class="nav__cta" href="#reserver">Réserver</a>
	</nav>
</header>
<main id="main">
