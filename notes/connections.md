# DB Connections

We might need to do more work when there are multiple websocket connections.

## Hacks/Workarounds

Since `pg` does not support prepared statements, the first one will be ran, and the results will be ignored.
