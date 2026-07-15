
.PHONY: web seo

web:
	@echo "Starting local server on http://localhost:8000"
	python3 -m http.server 8000

# Generate SEO surfaces: per-post static pages under blog/, sitemap.xml,
# robots.txt, feed.xml, and the index.html <noscript> fallback.
seo:
	node tools/build-seo.mjs
