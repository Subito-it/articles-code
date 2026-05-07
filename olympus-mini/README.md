# Olympus Demo

A minimal working example of the pattern described in the article:  
**Stop Fighting Ports: A Tiny Node.js Proxy for Multi-Repo Frontend Dev**

Three independent apps, one entry point, one command.

```
http://localhost:9000/          → app-search (port 3001)
http://localhost:9000/ads/*     → app-ads    (port 3002)
http://localhost:9000/profile/* → app-profile (port 3003)
```

---

## Setup (one time)

```bash
npm install
```

---

## Run

```bash
# All three apps
./start.sh app-search app-ads app-profile

# Or just one
./start.sh app-search
```

Then open `http://localhost:9000` in your browser.

The links in app-search cross-link to app-ads and app-profile — all under the same origin, just like production.

---

## How it works

```
demo/
├── proxy/
│   ├── server.js        # HTTP server + http-proxy
│   ├── config.js        # Port mappings
│   └── utils/
│       └── routing.js   # Regex path → app mapping
├── apps/
│   ├── app-search/      # Catch-all, port 3001
│   ├── app-ads/         # Handles /ads/*, port 3002
│   └── app-profile/     # Handles /profile/*, port 3003
├── start.sh             # Orchestration: kill ports, start proxy + apps
└── package.json
```

**Routing** (`proxy/utils/routing.js`) is a simple array of `{ pattern, app }` objects.  
First match wins — the same mental model as nginx `location` blocks.

To add a new app:
1. Add it to `config.js` with its port
2. Add its route rule to `routing.js`
3. Pass its name to `start.sh`
