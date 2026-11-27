# @repo/shared-util-app-name

This workspace holds `APP_NAME` and the Alchemy check that every stack and resource name starts with it. Keep `APP_NAME` separate from `SERVICE_NAME`.

Changing `APP_NAME` recreates the resources, including random values. Copy a stack's state to the new stack name before renaming it.
