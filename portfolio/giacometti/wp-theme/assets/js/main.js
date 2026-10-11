/* Giacometti: GSAP + ScrollTrigger + Lenis. All local, no CDN. */
(() => {
	const { gsap, ScrollTrigger, Lenis } = window;
	const $ = (s, c = document) => c.querySelector(s);
	const $$ = (s, c = document) => [...c.querySelectorAll(s)];
	const mq = (q) => window.matchMedia(q).matches;
	const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
	const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };

	/* ---- Hero: procedural door scene, scrubbed by scroll progress (0..1) ---- */
	const canvas = $('#door');
	const ctx = canvas.getContext('2d');
	let W = 0, H = 0;
	// Seeded bokeh so the interior is stable between frames.
	const bokeh = Array.from({ length: 46 }, (_, i) => {
		const r = (n) => { const x = Math.sin(i * 127.1 + n * 311.7) * 43758.5453; return x - Math.floor(x); };
		return { x: r(1) - .5, y: r(2) * .8 - .4, s: .02 + r(3) * .07, a: .25 + r(4) * .5, c: r(5) > .5 ? '224,128,106' : '201,168,106' };
	});

	function size() {
		const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
		W = canvas.clientWidth; H = canvas.clientHeight;
		canvas.width = W * dpr; canvas.height = H * dpr;
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
	}

	function lantern(x, y, r, g) {
		const rg = ctx.createRadialGradient(x, y, 0, x, y, r);
		rg.addColorStop(0, `rgba(224,128,106,${.5 * g})`); rg.addColorStop(1, 'rgba(224,128,106,0)');
		ctx.fillStyle = rg; ctx.fillRect(x - r, y - r, r * 2, r * 2);
		ctx.fillStyle = '#F1E8D8'; ctx.globalAlpha = g; ctx.fillRect(x - r * .03, y - r * .05, r * .06, r * .1); ctx.globalAlpha = 1;
	}

	function draw(p) {
		const dh = Math.min(H * .66, W * .9), dw = dh * .56;           // door size at scale 1
		const s = Math.pow(9, Math.pow(p, 1.15));                      // push-in
		const open = smooth(.42, .86, p);
		ctx.clearRect(0, 0, W, H);
		const bg = ctx.createLinearGradient(0, 0, 0, H);
		bg.addColorStop(0, '#12060b'); bg.addColorStop(1, '#2a0d14');
		ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

		ctx.save();
		ctx.translate(W / 2, H * .54); ctx.scale(s, s);                // door-local coords: origin = door centre
		const hw = dw / 2, hh = dh / 2;

		// stone wall courses
		ctx.strokeStyle = 'rgba(241,232,216,.05)'; ctx.lineWidth = 1 / s;
		for (let y = -H; y < H; y += dh * .09) { ctx.beginPath(); ctx.moveTo(-W, y); ctx.lineTo(W, y); ctx.stroke(); }
		// frame
		const fr = dw * .09;
		ctx.fillStyle = '#2a0f16'; ctx.fillRect(-hw - fr, -hh - fr * 1.6, dw + fr * 2, dh + fr * 1.6);
		ctx.strokeStyle = 'rgba(201,168,106,.6)'; ctx.lineWidth = 2 / s; ctx.strokeRect(-hw - fr, -hh - fr * 1.6, dw + fr * 2, dh + fr * 1.6);
		// lanterns + their wall light
		lantern(-hw - dw * .55, -hh * .55, dh * .42, 1); lantern(hw + dw * .55, -hh * .55, dh * .42, 1);

		// interior (clipped to the opening)
		ctx.save();
		ctx.beginPath(); ctx.rect(-hw, -hh, dw, dh); ctx.clip();
		const g = ctx.createRadialGradient(0, hh * .1, 0, 0, hh * .1, dh * .8);
		g.addColorStop(0, '#f6c98a'); g.addColorStop(.35, '#E0806A'); g.addColorStop(.75, '#5a1a1f'); g.addColorStop(1, '#2a0810');
		ctx.fillStyle = g; ctx.fillRect(-hw, -hh, dw, dh);
		ctx.globalCompositeOperation = 'lighter';
		bokeh.forEach((b) => {
			const bg2 = ctx.createRadialGradient(b.x * dw, b.y * dh, 0, b.x * dw, b.y * dh, b.s * dh);
			bg2.addColorStop(0, `rgba(${b.c},${b.a * .6})`); bg2.addColorStop(1, `rgba(${b.c},0)`);
			ctx.fillStyle = bg2; ctx.fillRect(b.x * dw - b.s * dh, b.y * dh - b.s * dh, b.s * dh * 2, b.s * dh * 2);
		});
		ctx.globalCompositeOperation = 'source-over';
		// table perspective
		ctx.strokeStyle = 'rgba(58,13,18,.55)'; ctx.lineWidth = 2 / s;
		for (let i = -5; i <= 5; i++) { ctx.beginPath(); ctx.moveTo(i * dw * .03, hh * .2); ctx.lineTo(i * dw * .22, hh); ctx.stroke(); }
		ctx.restore();

		// two door leaves swinging inward (hinge at outer edge; free edge recedes)
		const th = open * 1.35;                                         // radians
		[-1, 1].forEach((d) => {
			const xh = d * hw, xf = d * (hw - hw * Math.cos(th)), hf = hh * (1 - .16 * Math.sin(th));
			ctx.beginPath(); ctx.moveTo(xh, -hh); ctx.lineTo(xf, -hf); ctx.lineTo(xf, hf); ctx.lineTo(xh, hh); ctx.closePath();
			const lg = ctx.createLinearGradient(xh, 0, xf, 0);
			lg.addColorStop(0, '#3A0D12'); lg.addColorStop(1, `rgba(${20 + 30 * open},8,12,1)`);
			ctx.fillStyle = lg; ctx.fill();
			ctx.strokeStyle = 'rgba(201,168,106,.55)'; ctx.lineWidth = 1.5 / s; ctx.stroke();
			// raised panels (only while mostly facing us)
			if (open < .5) {
				ctx.strokeStyle = 'rgba(201,168,106,.28)';
				[[-.78, -.1], [.02, .78]].forEach(([a, b]) => ctx.strokeRect(Math.min(xh, xf) + Math.abs(xf - xh) * .12, hh * a, Math.abs(xf - xh) * .76, hh * (b - a)));
			}
			// brass handle on the free edge
			ctx.fillStyle = '#C9A86A'; ctx.beginPath(); ctx.arc(xf - d * hw * .1 * (1 - open), hh * .05, Math.max(2 / s, hw * .035 * (1 - open * .6)), 0, 7); ctx.fill();
		});
		ctx.restore();

		// hand-off to the aubergine menu
		const fade = smooth(.9, 1, p);
		if (fade) { ctx.fillStyle = `rgba(26,11,18,${fade})`; ctx.fillRect(0, 0, W, H); }
	}

	size();
	window.addEventListener('resize', () => { size(); draw(state.p); });
	const state = { p: 0 };

	/* ---- Reduced motion / no GSAP: static door, no smooth scroll ---- */
	const reduced = mq('(prefers-reduced-motion: reduce)');
	if (reduced || !gsap || !ScrollTrigger) {
		draw(reduced ? .3 : 0);
		$$('.art').forEach((a) => a.classList.add('is-on'));
		return;
	}
	draw(0);
	gsap.registerPlugin(ScrollTrigger);

	/* ---- Lenis, driven by the GSAP ticker ---- */
	const lenis = new Lenis({ lerp: .1, smoothWheel: true });
	lenis.on('scroll', ScrollTrigger.update);
	gsap.ticker.add((t) => lenis.raf(t * 1000));
	gsap.ticker.lagSmoothing(0);
	$$('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
		const t = $(a.getAttribute('href'));
		if (t) { e.preventDefault(); lenis.scrollTo(t, { offset: 0, duration: 1.6 }); }
	}));

	/* 1. hero: scrub the door, fade the logo out as we walk through */
	const heroText = $('.hero__text');
	ScrollTrigger.create({
		trigger: '#hero', start: 'top top', end: 'bottom bottom', scrub: true,
		onUpdate: (self) => {
			state.p = self.progress; draw(state.p);
			const t = smooth(0, .3, state.p);
			heroText.style.opacity = 1 - t;
			heroText.style.transform = `scale(${1 + t * .45})`;
			$('.hero__cue').style.opacity = 1 - smooth(0, .06, state.p);
		},
	});

	/* 2. menu: active art layer follows the section in view */
	const arts = $$('.art');
	$$('.msec').forEach((sec) => ScrollTrigger.create({
		trigger: sec, start: 'top 55%', end: 'bottom 55%',
		onToggle: (self) => self.isActive && arts.forEach((a) => a.classList.toggle('is-on', a.dataset.i === sec.dataset.i)),
	}));
	$$('.msec').forEach((sec) => gsap.from($$('.dish', sec), { y: 24, opacity: 0, duration: .8, ease: 'power2.out', stagger: .07, scrollTrigger: { trigger: sec, start: 'top 75%' } }));

	/* 3. private dining: card expands from inset to full bleed */
	const mobile = mq('(max-width: 820px)');
	const salon = gsap.timeline({ scrollTrigger: { trigger: '.salon', start: 'top top', end: 'bottom bottom', scrub: .6 } });
	salon
		.fromTo('.salon__card', { clipPath: mobile ? 'inset(20% 6% round 20px)' : 'inset(14% 24% round 28px)' }, { clipPath: 'inset(0% 0% round 0px)', ease: 'power2.inOut', duration: 1 }, 0)
		.fromTo('.salon__inner > *', { y: 50, opacity: 0 }, { y: 0, opacity: 1, stagger: .08, duration: .7, ease: 'power2.out' }, .45)
		.to({}, { duration: .4 }); // hold fully open

	/* 4. review wall: tilted plane, columns drift against each other */
	gsap.set('.wall__plane', { rotationX: 28, rotationY: -14, rotationZ: 6 });
	const wall = { scrollTrigger: { trigger: '.wall', start: 'top bottom', end: 'bottom top', scrub: 1 } };
	gsap.fromTo('.wall__plane', { rotationZ: 9, rotationY: -20 }, { rotationZ: 3, rotationY: -8, ease: 'none', ...wall });
	$$('.wall__col').forEach((col, i) => gsap.fromTo(col, { y: i === 1 ? -140 : 140 }, { y: i === 1 ? 140 : -140, ease: 'none', ...wall }));

	/* 5. night street: content rises in, windows breathe */
	gsap.from('.night__content > *', { y: 40, opacity: 0, duration: 1, stagger: .12, ease: 'power3.out', scrollTrigger: { trigger: '.night', start: 'top 55%' } });
	gsap.to('.night__win rect', { opacity: (i) => (i % 3 ? .35 : 1), duration: 2.2, repeat: -1, yoyo: true, stagger: { each: .25, from: 'random' }, ease: 'sine.inOut' });
})();
