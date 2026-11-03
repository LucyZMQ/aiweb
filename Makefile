.PHONY: setup dev db api web test build docker-up docker-down docker-logs clean

setup:
	./scripts/setup-local.sh

dev:
	./scripts/dev.sh

db:
	./scripts/dev-db.sh

api:
	./scripts/dev-api.sh

web:
	./scripts/dev-web.sh

test:
	cd apps/api && mvn -B test
	cd apps/web && pnpm build

build:
	cd apps/api && mvn -B -DskipTests package
	cd apps/web && pnpm build

docker-up:
	docker compose up -d --build

docker-down:
	docker compose down

docker-logs:
	docker compose logs -f --tail=100

clean:
	rm -rf apps/api/target apps/web/dist .data
