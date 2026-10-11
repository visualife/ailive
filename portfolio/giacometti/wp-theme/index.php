<?php
// Fallback: the site is a single-page showcase rendered by front-page.php.
get_header();
?>
<section class="plain">
	<?php while ( have_posts() ) : the_post(); ?>
		<h1><?php the_title(); ?></h1>
		<?php the_content(); ?>
	<?php endwhile; ?>
</section>
<?php
get_footer();
