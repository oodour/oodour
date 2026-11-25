---
max_turns: 10
allowed_tools: [Read, Glob, Grep, Skill]
---

We're adding WebSocket mocking: a `ws.link(url)` API whose handlers react to connection events (a client connects,
sends a message, closes) instead of answering one request with one response. `HttpHandler` and `GraphQLHandler`
both extend `RequestHandler` in `src/core/handlers`. Should the WebSocket handler extend `RequestHandler` too? How
would you shape it? Don't change any code yet.
