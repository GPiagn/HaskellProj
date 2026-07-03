{-# LANGUAGE OverloadedStrings #-}
module Main (main) where

import Server.Handler
import Network.Wai.Handler.Warp
import Control.Monad
import Database.PostgreSQL.Simple
import Database.PostgreSQL.Simple.Types
import qualified Data.ByteString.Char8 as BS
import System.Environment (lookupEnv)
import Data.Maybe (fromMaybe)
import Data.Pool (createPool, withResource) -- Adicione esta linha

runMigration :: Connection -> FilePath -> IO ()
runMigration conn fp = do
  sql <- readFile fp
  void $ execute_ conn (Query $ BS.pack sql)

main :: IO ()
main = do
  port  <- maybe 4000 read <$> lookupEnv "PORT"
  let localConn = "host=localhost port=5432 dbname=biblioteca_inventario user=postgres password=020316 sslmode=disable"
  dbUrl <- fromMaybe localConn <$> lookupEnv "DATABASE_URL"

  putStrLn $ "Servidor rodando na porta " ++ show port
  
  -- Cria um Pool de conexões em vez de uma conexão única
  -- Parâmetros: ação de abrir, ação de fechar, 1 stripe, 10 segundos inativa, max 5 conexões
  pool <- createPool (connectPostgreSQL (BS.pack dbUrl)) close 1 10 5

  -- Roda a migration pegando uma conexão temporária do pool
  withResource pool $ \conn -> runMigration conn "migration.sql"
  
  -- Passa o POOL para o seu app, e não mais uma conexão fixa
  run port (app pool)