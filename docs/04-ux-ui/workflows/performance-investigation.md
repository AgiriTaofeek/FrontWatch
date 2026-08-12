# Workflow — Performance Investigation

**Goal:** determine whether frontend performance has degraded and identify where.

**Flow:** Performance → metric regression → affected route → affected release → browser/device segmentation → navigation/resource evidence → long tasks → release comparison.

**Questions the UI must answer:** which metric degraded? when? which route is affected? which users are affected? did a deployment coincide with the regression? is it browser-specific?
