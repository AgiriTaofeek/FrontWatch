# TLS & Certificates

All production external traffic uses TLS.

Support:

- customer-provided certificates
- enterprise CAs
- automated certificate management where permitted

Certificate rotation must avoid unnecessary downtime.

The browser ingestion endpoint must use HTTPS.

Document any trusted internal HTTP exceptions explicitly; do not make insecure transport the default.
