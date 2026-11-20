# Notice

This package deploys **Kaneo** by Andrej Acevski and contributors (https://github.com/usekaneo/kaneo), licensed under the MIT License:

> MIT License — Copyright (c) 2024 Andrej Acevski. Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions: The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software. THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND.

What is used and how:

- `ghcr.io/usekaneo/kaneo:2.50.0` (digest pinned) is the base image, unmodified.
- `services/kaneo/railway-kaneo.sh` is adapted from upstream `deploy/kaneo-entrypoint.sh` at tag `v2.50.0` (MIT, copyright above). Changes are described in its header.
- Configuration follows upstream `compose.yml`, `.env.sample`, `ENVIRONMENT_SETUP.md` and the docs pages on environment variables and object storage at tag `v2.50.0` (checked 2026-11-20).
- PostgreSQL service definition from Railway's official Postgres template (`ghcr.io/railwayapp-templates/postgres-ssl`).
- Icon: selfh.st icons (https://github.com/selfhst/icons).

Market templates were read for comparison only; no files or text were copied from them. README and docs text are original.

This is a community template and is not affiliated with or endorsed by the Kaneo project.
