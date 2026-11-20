# Kaneo 2.50.0 (MIT) with a Railway start script: first-admin bootstrap before the
# public port opens, Bucket CORS for browser uploads, safe handling of form values.
ARG KANEO_IMAGE=ghcr.io/usekaneo/kaneo:2.50.0@sha256:03ad082e33945b9c091266af60c7c88865cb2fab37ff33d91cbbcab626b0094d
FROM ${KANEO_IMAGE}

COPY --chmod=0755 railway-kaneo.sh /usr/local/bin/railway-kaneo.sh
COPY --chmod=0644 railway-kaneo.mjs /usr/local/lib/railway-kaneo.mjs

CMD ["/usr/local/bin/railway-kaneo.sh"]
