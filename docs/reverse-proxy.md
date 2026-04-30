---
layout: default
title: Reverse Proxy Setup
nav_order: 4
description: "Configure Nginx, Traefik, Caddy, or Apache as a reverse proxy for BorgScale"
---

# Reverse Proxy Setup Guide

Complete guide for running BorgScale behind a reverse proxy with Nginx, Traefik, Caddy, or Apache. You can serve the app at the root of a (sub)domain (e.g., `backups.example.com`) or under a subfolder (e.g., `example.com/borgscale`).

---

## Quick Start (Nginx)

The simplest reverse proxy configuration:

```nginx
server {
    listen 80;
    server_name backups.example.com;

    location / {
        proxy_pass http://localhost:8081;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket/SSE support (required for real-time updates)
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 86400;
    }
}
```

---

## Nginx Configurations

### Basic (Root Domain)

```nginx
server {
    listen 80;
    server_name backups.example.com;

    location / {
        proxy_pass http://localhost:8081;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket/SSE support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 86400;
    }
}
```

### Subfolder Deployment (e.g., /borgscale)

To serve BorgScale under a sub-path such as `https://example.com/borgscale`:

1. **Set the `BASE_PATH` environment variable** to the sub-path (no trailing slash), e.g. `/borgscale`.

2. **Configure NGINX** to strip the path prefix when proxying. Use a trailing slash on `proxy_pass` so that `/borgscale` is removed before the request reaches the backend:

```nginx
server {
    listen 443 ssl http2;
    server_name example.com;

    # SSL configuration...

    location /borgscale/ {
        proxy_pass http://localhost:8081/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket/SSE support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 86400;
    }
}
```

3. **Docker Compose** — pass the base path into the container:

```yaml
environment:
  - BASE_PATH=/borgscale
```

The app will then serve at `https://example.com/borgscale` and use `/borgscale` for all client-side routes and API calls.

**Direct access:** With `BASE_PATH` set, you can also open the app at the same path on the container without a reverse proxy, e.g. `http://localhost:8081/borgscale` (use the port you expose). Use this for local access or when the container port is exposed directly. Accessing the root URL (e.g. `http://localhost:8081/`) automatically redirects to the base path (e.g. `/borgscale`).

### With SSL/HTTPS (Let's Encrypt)

```nginx
server {
    listen 443 ssl http2;
    server_name backups.example.com;

    ssl_certificate /etc/letsencrypt/live/backups.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/backups.example.com/privkey.pem;

    # Strong SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    location / {
        proxy_pass http://localhost:8081;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket/SSE support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 86400;
    }
}

# HTTP to HTTPS redirect
server {
    listen 80;
    server_name backups.example.com;
    return 301 https://$host$request_uri;
}
```

### With Authelia

```nginx
server {
    listen 443 ssl http2;
    server_name backups.example.com;

    # SSL configuration...

    # Authelia authentication
    include /path/to/authelia-authrequest.conf;

    location / {
        # Forward authenticated username to BorgScale
        proxy_set_header X-Remote-User $remote_user;
        proxy_set_header X-Forwarded-User $remote_user;

        proxy_pass http://127.0.0.1:8081;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket/SSE support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 86400;
    }
}
```

See [Security Guide - Authelia](security.md#authelia) for Authelia `access_control` configuration.

### With Basic Auth (htpasswd)

```nginx
server {
    listen 443 ssl http2;
    server_name backups.example.com;

    # SSL configuration...

    auth_basic "Borg Backups";
    auth_basic_user_file /etc/nginx/.htpasswd;

    location / {
        # Forward authenticated username
        proxy_set_header X-Remote-User $remote_user;
        proxy_set_header X-Forwarded-User $remote_user;

        proxy_pass http://127.0.0.1:8081;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket/SSE support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 86400;
    }
}
```

Create users:
```bash
htpasswd -c /etc/nginx/.htpasswd username
```

---

## Traefik Configuration

Use Docker labels with automatic Let's Encrypt certificates:

```yaml
services:
  borgscale:
    image: ainullcode/borgscale:latest
    container_name: borg-web-ui
    restart: unless-stopped
    volumes:
      - borg_data:/data
      - borg_cache:/home/borg/.cache/borg
      - /home/yourusername:/local:rw
    environment:
      - PUID=1000
      - PGID=1000
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.borgscale.rule=Host(`backups.example.com`)"
      - "traefik.http.routers.borgscale.entrypoints=websecure"
      - "traefik.http.routers.borgscale.tls.certresolver=letsencrypt"
      - "traefik.http.services.borgscale.loadbalancer.server.port=8081"
    networks:
      - traefik

networks:
  traefik:
    external: true

volumes:
  borg_data:
  borg_cache:
```

**Notes:**
- Replace `backups.example.com` with your domain
- The `traefik` network must be created and configured in your Traefik instance
- `certresolver=letsencrypt` assumes you have a Let's Encrypt resolver configured in Traefik

---

## Caddy Configuration

Caddy provides automatic HTTPS with zero configuration:

```
backups.example.com {
    reverse_proxy localhost:8081
}
```

Caddy automatically obtains and renews SSL certificates from Let's Encrypt.

---

## Proxy Authentication

Disable the built-in login screen and let your reverse proxy handle authentication:

```yaml
environment:
  - DISABLE_AUTHENTICATION=true          # Disable built-in login screen
  - PROXY_AUTH_HEADER=X-Forwarded-User   # Header containing authenticated username (optional, default shown)
  - PROXY_AUTH_ROLE_HEADER=X-Borg-Role   # Optional trusted BorgScale global role header
  - PROXY_AUTH_ALL_REPOSITORIES_ROLE_HEADER=X-Borg-All-Repositories-Role   # Optional trusted default repository role header
  - PROXY_AUTH_EMAIL_HEADER=X-Borg-Email   # Optional trusted email header
  - PROXY_AUTH_FULL_NAME_HEADER=X-Borg-Full-Name   # Optional trusted display-name header
```

**How it works:**
- BorgScale reads the authenticated username from HTTP headers set by your reverse proxy
- Users are auto-created on first access as `viewer` by default
- Optional trusted headers can assign BorgScale `viewer`, `operator`, or `admin` roles
- Optional trusted headers can assign a default repository role of `viewer` or `operator`
- Optional trusted headers can populate `email` and `full_name`
- Requests without a trusted identity header are rejected with HTTP 401

**Supported headers (checked in order when using the default username header):**
- `X-Forwarded-User` (default, configurable via `PROXY_AUTH_HEADER`)
- `X-Remote-User`
- `Remote-User`
- `X-authentik-username` (Authentik)

If you set a custom `PROXY_AUTH_HEADER`, BorgScale trusts only that configured header for username resolution.

**Supported authentication providers:**

| Provider | Header |
|----------|--------|
| **Authentik** | `X-authentik-username` |
| **Authelia** | `X-Remote-User` |
| **Keycloak** | `X-Forwarded-User` |
| **Cloudflare Access** | `Cf-Access-Authenticated-User-Email` |
| **Google IAP** | `X-Goog-Authenticated-User-Email` |
| **Azure AD** | `X-MS-CLIENT-PRINCIPAL-NAME` |

### Authentik Setup

**docker-compose.yml:**
```yaml
services:
  borgscale:
    image: ainullcode/borgscale:latest
    environment:
      - DISABLE_AUTHENTICATION=true
      - PROXY_AUTH_HEADER=X-authentik-username
    networks:
      - internal
    # NO ports exposed - only accessible via proxy

  authentik-proxy:
    image: ghcr.io/goauthentik/proxy:latest
    environment:
      - AUTHENTIK_HOST=https://auth.example.com
      - AUTHENTIK_INSECURE=false
      - AUTHENTIK_TOKEN=your-outpost-token
    ports:
      - "8443:8443"
    networks:
      - internal
      - external
    labels:
      - "authentik.enabled=true"
      - "authentik.upstream=http://borgscale:8081"
```

**Authentik Application Setup:**
1. Create new application in Authentik
2. Select **Proxy Provider**
3. Set External URL: `https://backups.example.com`
4. Set Internal URL: `http://borgscale:8081`
5. Enable **Forward auth (single application)**
6. Set authorization flow and user/group bindings

**Authentik header mapping example:**

If you want Authentik or your proxy layer to assign BorgScale roles, emit separate trusted headers.

```yaml
environment:
  - DISABLE_AUTHENTICATION=true
  - PROXY_AUTH_HEADER=X-authentik-username
  - PROXY_AUTH_ROLE_HEADER=X-Borg-Role
  - PROXY_AUTH_ALL_REPOSITORIES_ROLE_HEADER=X-Borg-All-Repositories-Role
  - PROXY_AUTH_EMAIL_HEADER=X-Borg-Email
  - PROXY_AUTH_FULL_NAME_HEADER=X-Borg-Full-Name
```

Example reverse-proxy forwarding:

```nginx
location / {
    proxy_set_header X-authentik-username $upstream_http_x_authentik_username;
    proxy_set_header X-Borg-Role $upstream_http_x_borg_role;
    proxy_set_header X-Borg-All-Repositories-Role $upstream_http_x_borg_all_repositories_role;
    proxy_set_header X-Borg-Email $upstream_http_x_borg_email;
    proxy_set_header X-Borg-Full-Name $upstream_http_x_borg_full_name;

    proxy_pass http://127.0.0.1:8081;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

Valid BorgScale values:
- `X-Borg-Role`: `viewer`, `operator`, `admin`
- `X-Borg-All-Repositories-Role`: `viewer`, `operator`
- `X-Borg-Email`: any trusted email string
- `X-Borg-Full-Name`: any trusted display name

### Cloudflare Access Setup

**1. Create Cloudflare Access application:**
- Application name: Borg Backups
- Session duration: 24 hours
- Add policies for users/groups

**2. Configure BorgScale:**
```yaml
environment:
  - DISABLE_AUTHENTICATION=true
  - PROXY_AUTH_HEADER=Cf-Access-Authenticated-User-Email
```

**3.** Cloudflare Access forwards the user's email in the `Cf-Access-Authenticated-User-Email` header.

See [Security Guide - Proxy/OIDC Authentication](security.md#proxyoidc-authentication) for the full reference including user management, testing, troubleshooting, and switching between auth methods.

---

## Docker Network Isolation

When using proxy authentication, you **must** ensure BorgScale is only accessible through your authenticated proxy.

**Bind to localhost only:**
```yaml
ports:
  - "127.0.0.1:8081:8081"  # Only accessible via localhost
```

**Block direct access with firewall rules:**
```bash
# Block external access to port 8081
sudo ufw deny 8081
sudo ufw allow from 127.0.0.1 to any port 8081
```

**Use Docker networks for isolation:**
```yaml
services:
  borgscale:
    networks:
      - internal
    # NO ports exposed - only accessible via proxy network

  reverse-proxy:
    networks:
      - internal
      - external
    ports:
      - "443:443"

networks:
  internal:
    internal: true  # No external access
  external:
```

**Why this matters:** If BorgScale is directly accessible, anyone can spoof the authentication header (`X-Forwarded-User`) and impersonate any user. Your reverse proxy must be the only path to the application.

---

## WebSocket and SSE Support

BorgScale uses WebSocket and Server-Sent Events (SSE) for real-time updates (backup progress, log streaming, etc.). Your reverse proxy **must** forward these correctly.

**Required headers for Nginx configurations:**

```nginx
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
proxy_read_timeout 86400;  # 24 hours - prevents premature disconnection
```

**What these do:**
- `proxy_http_version 1.1` — Required for WebSocket upgrade
- `Upgrade` / `Connection` headers — Enable WebSocket handshake
- `proxy_read_timeout 86400` — Prevents Nginx from closing long-lived connections (default 60s is too short)

**Traefik** and **Caddy** handle WebSocket/SSE automatically with no extra configuration.

---

## Troubleshooting

### WebSocket/SSE Timeouts

**Symptom:** Real-time updates (backup progress, log streaming) stop working or disconnect frequently.

**Fix:** Increase `proxy_read_timeout` in Nginx:
```nginx
proxy_read_timeout 86400;  # 24 hours
```

### Headers Not Forwarded

**Symptom:** Proxy authentication doesn't work; users see login screen despite `DISABLE_AUTHENTICATION=true`.

**Fix:** Verify your proxy sends the correct header:
```bash
# Test from the proxy server
curl -H "X-Forwarded-User: testuser" http://localhost:8081/api/auth/me
```

Check logs:
```bash
docker logs borg-web-ui 2>&1 | grep "proxy"
docker logs borg-web-ui 2>&1 | grep "X-Forwarded-User"
```

### 502 Bad Gateway

**Symptom:** Nginx returns 502 when accessing BorgScale.

**Fix:**
- Verify the container is running: `docker ps | grep borg`
- Check the port matches: `docker logs borg-web-ui | grep "listening"`
- If using Docker networks, ensure both containers are on the same network
- Check Nginx can reach the upstream: `curl http://localhost:8081`

### Mixed Content Warnings

**Symptom:** Browser console shows mixed content errors when using HTTPS.

**Fix:** Ensure you forward the protocol header:
```nginx
proxy_set_header X-Forwarded-Proto $scheme;
```

---

## Next Steps

- [Configuration Guide](configuration.md) - Environment variables and volume mounts
- [Security Guide](security.md) - Full security best practices and proxy auth reference
- [Cache Configuration](cache.md) - Set up Redis for faster archive browsing
