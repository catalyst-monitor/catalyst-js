set -e
set -x

rm -rf src/gen/

mkdir -p src/gen/

npx protoc -I=../../proto --es_opt target=ts --es_out=src/gen/ ../../proto/*.proto
