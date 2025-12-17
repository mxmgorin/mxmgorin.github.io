
.PHONY: web

web:
	@echo "Starting local server on http://localhost:8000"
	python3 -m http.server 8000
