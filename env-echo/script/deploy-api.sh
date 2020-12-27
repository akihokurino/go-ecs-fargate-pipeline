#!/usr/bin/env bash

APP_ROOT=$(dirname $0)/..
cd ${APP_ROOT}

export VER=${VER:-local-$(date +%Y%m%d%H%M)}

$(aws ecr get-login --no-include-email --region ap-northeast-1)
docker build . -t 326914400610.dkr.ecr.ap-northeast-1.amazonaws.com/env-echo:${VER}
docker push 326914400610.dkr.ecr.ap-northeast-1.amazonaws.com/env-echo:${VER}

envsubst < fargate/api-definition.json > fargate/task-definition.json

aws ecs register-task-definition --cli-input-json file://$PWD/fargate/task-definition.json --profile me