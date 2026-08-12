# Workflow — Application Health Monitoring

**Goal:** give engineers and CTOs a fast answer to "is the application healthy right now?"

**Overview:** Application → Health → {error health, performance health, network health, release health, telemetry health}.

**Health dashboard first screen shows:** current health state, error rate, error trend, performance metrics, failed requests, active issues, latest deployment, release health, telemetry freshness.

**Critical distinction the system must never blur:** *Healthy* vs. *No telemetry* vs. *Telemetry stale* are three different states. A lack of data must never silently render as "healthy."
