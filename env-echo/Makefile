MAKEFLAGS=--no-builtin-rules --no-builtin-variables --always-make
ROOT := $(realpath $(dir $(lastword $(MAKEFILE_LIST))))
export PATH := $(ROOT)/script:$(PATH)

deploy-batch:
	deploy-batch.sh

deploy-api:
	deploy-api.sh