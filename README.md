# gym-pro

## Docker deployment (server + client + mongo)

This project supports two Docker flows:

- Local build flow (developer machine)
- Private image flow via GitHub Container Registry (client machine, no source code share)

### Added files

- `docker-compose.yml`
- `docker-compose.deploy.yml`
- `gym-server/Dockerfile`
- `gym-admin-panel/Dockerfile`
- `gym-admin-panel/nginx.conf`
- `.env.example`
- `.github/workflows/publish-ghcr.yml`

### Local build flow (your own PC)

1. Install Docker Desktop.
2. Enable **Start Docker Desktop when you log in**.
3. Copy `.env.example` to `.env` and set `JWT_SECRET`.
4. Start once: `docker compose up -d --build`

After first run, containers auto-start with Docker because `restart: unless-stopped`.

### Private image flow (client PC without source code)

1. Push code to a private GitHub repository.
2. Keep repository default branch as `main`.
3. GitHub Actions workflow `publish-ghcr.yml` will publish:
   - `ghcr.io/<owner>/gym-server:latest`
   - `ghcr.io/<owner>/gym-admin-panel:latest`
4. On client machine, only provide:
   - `docker-compose.deploy.yml`
   - `.env` (with `JWT_SECRET`, `GITHUB_OWNER`, `IMAGE_TAG=latest`)
5. On client machine, log in once to GHCR:
   - `docker login ghcr.io` (GitHub username + personal access token with package read)
6. Start once:
   - `docker compose -f docker-compose.deploy.yml up -d`

After that, client only needs PC on + Docker Desktop auto-start.
