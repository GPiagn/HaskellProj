# ---------- build ----------
FROM haskell:9.6.7 AS build
WORKDIR /build

RUN apt-get update && apt-get install -y curl gnupg lsb-release pkg-config \
 && install -d /usr/share/postgresql-common/pgdg \
 && curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc \
 && echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] http://apt.postgresql.org/pub/repos/apt bookworm-pgdg main" > /etc/apt/sources.list.d/pgdg.list \
 && apt-get update && apt-get install -y libpq-dev \
 && rm -rf /var/lib/apt/lists/*

COPY HaskellProj.cabal ./
RUN cabal update && cabal build --only-dependencies

COPY . .
RUN cabal build exe:HaskellProj
RUN mkdir -p /out && cp "$(cabal list-bin exe:HaskellProj)" /out/HaskellProj

# ---------- runtime ----------
FROM debian:bookworm-slim
WORKDIR /app
RUN apt-get update && apt-get install -y curl gnupg ca-certificates \
 && install -d /usr/share/postgresql-common/pgdg \
 && curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc \
 && echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] http://apt.postgresql.org/pub/repos/apt bookworm-pgdg main" > /etc/apt/sources.list.d/pgdg.list \
 && apt-get update && apt-get install -y libpq5 \
 && rm -rf /var/lib/apt/lists/*
COPY --from=build /out/HaskellProj /app/HaskellProj
COPY migration.sql /app/migration.sql
CMD ["/app/HaskellProj"]