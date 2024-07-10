SHELL = bash
MAKEFLAGS += --no-print-directory

.PHONY: help

help: ## Show help
help: _cmd_prefix= [^_]+
help: _help

_help:
	@awk 'BEGIN {FS = ":.*?## "} \
	/^$(_cmd_prefix)[0-9a-zA-Z_-]+$(_cmd_suffix):.*?##/ \
	{printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST) | \
	sed -E 's/@([0-9a-zA-Z_-]+)/\o033[31m@\o033[0m\o033[33m\1\o033[0m/g' | \
 	uniq --group -w 20

_assert-tools:
	@for TOOL in $(TOOLS); do \
		type $$TOOL &> /dev/null || (echo -e "Please install '$$TOOL' and run the command again.\n"; exit 1); \
	done

TOOLS=docker docker-compose
DOCKER_TOOL=docker-compose -f tools/docker-compose.yaml

db@up: ## Run db
db@up: _assert-tools
db@up:
	@$(DOCKER_TOOL) up --build -d db

db@stop: ## Stop db
db@stop: _assert-tools
db@stop:
	@$(DOCKER_TOOL) stop db

db@migrate: ## Run db migrations
db@migrate: _assert-tools
db@migrate:
	@cd apps/api && pnpm run drizzle:migrate

docker@up: ## Run apps in docker
docker@up: _assert-tools
docker@up:
	@$(DOCKER_TOOL) up --build -d

docker@down: ## Stop apps in docker
docker@down: _assert-tools
docker@down:
	@$(DOCKER_TOOL) down

local@up: ## Run apps locally
local@up: _assert-tools
local@up: db@up
	@pnpm i
	@pnpm run build
	@NODE_ENV=development pnpm run start
