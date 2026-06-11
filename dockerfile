# ---------- build ----------
FROM haskell:9.6.7 AS build
WORKDIR /build
RUN apt-get update && apt-get install -y libpq-dev && rm -rf /var/lib/apt/lists/*

# cache de dependências: copia só o .cabal primeiro
COPY HaskellProj.cabal ./
RUN cabal update && cabal build --only-dependencies

# agora o código
COPY . .
RUN cabal build exe:HaskellProj
RUN mkdir -p /out && cp "$(cabal list-bin exe:HaskellProj)" /out/HaskellProj

# ---------- runtime ----------
FROM debian:bookworm-slim
WORKDIR /app
RUN apt-get update && apt-get install -y libpq5 ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=build /out/HaskellProj /app/HaskellProj
COPY migration.sql /app/migration.sql
CMD ["/app/HaskellProj"]