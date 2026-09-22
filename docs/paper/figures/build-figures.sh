#!/bin/bash
# Compile every standalone figure in src/ to out/ (PDF for \includegraphics,
# PNG at 220 dpi for quick visual review). Requires pdflatex and pdftoppm.
set -euo pipefail
cd "$(dirname "$0")/src"
mkdir -p ../out
for fig in fig-*.tex; do
  echo "== $fig"
  pdflatex -interaction=nonstopmode -halt-on-error -output-directory=../out "$fig" >/dev/null
  base="${fig%.tex}"
  pdftoppm -png -singlefile -r 220 "../out/$base.pdf" "../out/$base"
  rm -f "../out/$base.aux" "../out/$base.log" "../out/$base.out"
done
echo "done: $(ls ../out/fig-*.pdf | wc -l | tr -d ' ') figures"
