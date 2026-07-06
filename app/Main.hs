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
import Data.Pool (newPool, defaultPoolConfig)

-- CORREÇÃO AQUI: Lemos o arquivo como ByteString binário bruto usando BS.readFile
runMigration :: Connection -> FilePath -> IO ()
runMigration conn fp = do
  sql <- BS.readFile fp
  void $ execute_ conn (Query sql)

main :: IO ()
main = do
  port  <- maybe 4000 read <$> lookupEnv "PORT"
  let localConn = "host=localhost port=5432 dbname=biblioteca_inventario user=postgres password=020316 sslmode=disable"
  dbUrl <- fromMaybe localConn <$> lookupEnv "DATABASE_URL"

  putStrLn $ "Servidor rodando na porta " ++ show port
  
  -- 1. Cria uma conexão rápida apenas para rodar as tabelas do migration.sql
  migrationConn <- connectPostgreSQL (BS.pack dbUrl)
  runMigration migrationConn "migration.sql"
  close migrationConn

  -- 2. Inicializa o Pool de conexões seguro para a concorrência da API
  pool <- newPool (defaultPoolConfig (connectPostgreSQL (BS.pack dbUrl)) close 60 10)
  
  -- 3. Inicia o Warp com o Pool configurado
  run port (app pool)