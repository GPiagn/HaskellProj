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

runMigration :: Connection -> FilePath -> IO ()
runMigration conn fp = do
  sql <- readFile fp
  void $ execute_ conn (Query $ BS.pack sql)

main :: IO ()
main = do
  port  <- maybe 4000 read <$> lookupEnv "PORT"          -- Render injeta PORT
  let localConn = "host=localhost port=5432 dbname=biblioteca_inventario user=postgres password=020316 sslmode=disable"
  dbUrl <- fromMaybe localConn <$> lookupEnv "DATABASE_URL"  -- Render injeta DATABASE_URL

  putStrLn $ "Servidor rodando na porta " ++ show port
  conn <- connectPostgreSQL (BS.pack dbUrl)
  runMigration conn "migration.sql"
  run port (app conn)