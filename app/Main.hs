{-# LANGUAGE OverloadedStrings #-}
module Main (main) where

import Server.Handler
import Network.Wai.Handler.Warp
import Control.Monad
import Database.PostgreSQL.Simple
import Database.PostgreSQL.Simple.Types
import qualified Data.ByteString.Char8 as BS

runMigration :: Connection -> FilePath -> IO ()
runMigration conn fp = do
  sql <- readFile fp
  void $ execute_ conn (Query $ BS.pack sql)

main :: IO ()
main = do
  putStrLn "Servidor rodando na porta 4000"

  conn <- connectPostgreSQL "host=localhost port=5432 dbname=biblioteca_inventario user=postgres password=020316 sslmode=disable"

  runMigration conn "migration.sql"

  run 4000 (app conn)