# Saas Backend

## Running App Locally

- Easiest way is using docker compose

```bash
docker compose up
```

- It will build the app using dockerfile `Dockerfile.local`
- Make sure you have a `.env.docker` file in repo root with `HOST` set to `0.0.0.0` to allow access from host machine
- Your local `app` directory will be mounted to `/usr/src/app` in container
- This will ensure that any changes you make locally will be reflected in container immediately

- To implement changes in any folder other than `/app`, rebuild the container using

```bash
docker compose up --build
```
