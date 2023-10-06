set -e
set -x

rm -rf src/gen/

mkdir -p src/gen/

npx protoc -I=../../proto --ts_proto_opt=esModuleInterop=true --plugin=../../node_modules/.bin/protoc-gen-ts_proto --ts_proto_out=src/gen/ ../../proto/*.proto
