# ---------- build ----------
FROM haskell:9.6.7 AS build
WORKDIR /build
RUN apt-get update && apt-get install -y libpq-dev pkg-config && rm -rf /var/lib/apt/lists/*

# cabal.project precisa estar presente já na etapa de dependências
COPY HaskellProj.cabal cabal.project ./
RUN cabal update && cabal build --only-dependencies

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