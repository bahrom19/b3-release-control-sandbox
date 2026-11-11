# B3 Release Control Sandbox

This is a public, synthetic sandbox for demonstrating release-control mechanics.
It is **not** production deployment infrastructure and contains no real service
credentials, sensitive operational data, or proprietary application source.

The sandbox exercises:

- CI provenance and exact-SHA checks;
- synthetic release ledger state;
- changed-service classification;
- dummy backend/web/image adapters;
- fail-closed stale-SHA behavior.

All deployment outputs are simulated:

```json
{
  "simulated": true,
  "deployed": false
}
```

The release gate is disabled unless the repository variable
`ENABLE_RELEASE_GATE` is `true`. App/ruleset proof is a separate future scope and
is not implemented here.

No real Railway, GHCR, cloud, database, or production endpoint is used.
