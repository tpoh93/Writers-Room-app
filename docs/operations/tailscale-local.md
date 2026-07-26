# Tailscale-Only Remote Access

## Purpose

Version 1 of Writers Room App remains a private local application. Docker publishes only the frontend on `127.0.0.1:8080`; Tailscale Serve provides authenticated HTTPS access to approved devices in Piotr's tailnet without exposing the application to the public internet.

Tailscale Serve is the approved remote-access mechanism. Tailscale Funnel is not approved because it publishes a service to the broader internet.

## Preconditions

1. Writers Room App is running through the canonical Compose stack.
2. `.env` retains `APP_BIND_ADDRESS=127.0.0.1`.
3. Tailscale is installed and signed in on the Mac hosting the application.
4. Every device allowed to access Writers Room App belongs to the approved tailnet.

Verify the local network contract before enabling remote access:

```bash
cp .env.example .env
./scripts/check-local-exposure.sh
docker compose up -d
curl -fsS http://127.0.0.1:8080/healthz/ready
```

Expected local exposure result:

```text
PASS: Compose defaults to a local-only frontend binding and no backend host port
```

## Enable private remote access

Check that the Mac is connected to the tailnet:

```bash
tailscale status
```

Publish the existing localhost application only inside the tailnet:

```bash
tailscale serve --bg localhost:8080
```

Inspect the resulting Serve configuration and HTTPS endpoint:

```bash
tailscale serve status --json
```

The status output supplies the tailnet-only HTTPS hostname. Do not replace this with a public DNS record or router port forwarding.

## Acceptance verification

### C1: approved tailnet device

From an approved device with Tailscale connected:

1. Open the HTTPS URL shown by `tailscale serve status --json`.
2. Confirm that the Writers Room application shell loads.
3. Confirm that the same-origin readiness endpoint responds at `/healthz/ready`.
4. Record only the date, device role, PASS/FAIL result, and redacted hostname. Do not commit device names, tailnet names, IP addresses, private writing, or screenshots containing content.

### C2: no public route

From a device that is not connected to the tailnet, or after disconnecting Tailscale on a test device:

1. Attempt to open the same HTTPS hostname.
2. Confirm that Writers Room App is not reachable.
3. Confirm that the home router has no port-forwarding rule for ports `8080`, `54321`, `80`, or `443` pointing at the Mac.
4. Confirm that `APP_BIND_ADDRESS` remains `127.0.0.1`.
5. Record the negative result without publishing the full hostname or network details.

Both observations are required before Gate C can change from `NOT RUN` to `PASS`.

## Disable remote access

Remove the Serve configuration:

```bash
tailscale serve reset
```

Verify that no Serve mapping remains:

```bash
tailscale serve status --json
```

The local application may continue running at `http://127.0.0.1:8080` after Serve is reset.

## Prohibited shortcuts

Do not use any of the following for Version 1:

- `tailscale funnel`
- router port forwarding
- UPnP exposure
- Cloudflare Tunnel or another public tunnel
- publishing backend port `54321`
- changing `APP_BIND_ADDRESS` to `0.0.0.0` or `::`
- exposing a VPS before the VPS migration gate is explicitly approved

These shortcuts change the threat model from a private tailnet service to a publicly reachable service and invalidate Gate C evidence.

## Troubleshooting

Confirm the local application first:

```bash
curl -fsS http://127.0.0.1:8080/healthz/frontend
curl -fsS http://127.0.0.1:8080/healthz/ready
```

Then inspect Tailscale:

```bash
tailscale status
tailscale serve status --json
```

If Serve points to the wrong target, reset it and apply the approved target again:

```bash
tailscale serve reset
tailscale serve --bg localhost:8080
```

Do not solve connectivity problems by broadening the Docker bind address.
