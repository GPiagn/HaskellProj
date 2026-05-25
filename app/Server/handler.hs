{-# LANGUAGE DataKinds         #-}
{-# LANGUAGE TypeOperators     #-}
{-# LANGUAGE TypeApplications  #-}
{-# LANGUAGE OverloadedStrings #-}
module Server.Handler where

import Control.Monad.IO.Class       (liftIO)
import Control.Monad.Except         (throwError)
import Data.Proxy                   (Proxy (..))
import Network.Wai                  (Application)
import Network.Wai.Middleware.Cors
import Servant.API
import Servant.Server
import Data.Aeson                   (Value, object, (.=))
import Database.PostgreSQL.Simple   (Connection)

import Types.Exemplar
import DB.Queries

-- Definição das rotas da API
type API =
       "ping"        :> Get '[JSON] Value
  :<|> "exemplares"  :> Get '[JSON] [Exemplar]
  :<|> "exemplares"  :> Capture "id" Int :> Get '[JSON] Exemplar
  :<|> "exemplares"  :> ReqBody '[JSON] ExemplarInput :> Post '[JSON] Value
  :<|> "exemplares"  :> Capture "id" Int :> ReqBody '[JSON] ExemplarInput :> Put '[JSON] Value
  :<|> "exemplares"  :> Capture "id" Int :> Delete '[JSON] Value

-- Server recebe a conexão e repassa para cada handler
server :: Connection -> Server API
server conn =
       handlePing
  :<|> handleListExemplares  conn
  :<|> handleGetExemplar     conn
  :<|> handleCreateExemplar  conn
  :<|> handleUpdateExemplar  conn
  :<|> handleDeleteExemplar  conn

-- GET /ping
handlePing :: Handler Value
handlePing = return $ object
  [ "status" .= ("ok"         :: String)
  , "msg"    .= ("API online" :: String)
  ]

-- GET /exemplares — listar todos
handleListExemplares :: Connection -> Handler [Exemplar]
handleListExemplares conn = liftIO (listExemplares conn)

-- GET /exemplares/:id — buscar um exemplar
handleGetExemplar :: Connection -> Int -> Handler Exemplar
handleGetExemplar conn eid = do
  result <- liftIO (getExemplarById conn eid)
  case result of
    Just ex -> return ex
    Nothing -> throwError err404 { errBody = "Exemplar não encontrado" }

-- POST /exemplares — criar novo
handleCreateExemplar :: Connection -> ExemplarInput -> Handler Value
handleCreateExemplar conn input = do
  result <- liftIO (insertExemplar conn input)
  case result of
    Just newId -> return $ object
      [ "id" .= newId
      , "msg" .= ("Exemplar criado com sucesso" :: String)
      ]
    Nothing -> throwError err500 { errBody = "Erro ao criar exemplar" }

-- PUT /exemplares/:id — atualizar
handleUpdateExemplar :: Connection -> Int -> ExemplarInput -> Handler Value
handleUpdateExemplar conn eid input = do
  affected <- liftIO (updateExemplar conn eid input)
  if affected > 0
    then return $ object
      [ "id" .= eid
      , "msg" .= ("Exemplar atualizado com sucesso" :: String)
      ]
    else throwError err404 { errBody = "Exemplar não encontrado" }

-- DELETE /exemplares/:id — remover
handleDeleteExemplar :: Connection -> Int -> Handler Value
handleDeleteExemplar conn eid = do
  affected <- liftIO (deleteExemplar conn eid)
  if affected > 0
    then return $ object
      [ "id" .= eid
      , "msg" .= ("Exemplar removido com sucesso" :: String)
      ]
    else throwError err404 { errBody = "Exemplar não encontrado" }

-- CORS
corsPolicy :: CorsResourcePolicy
corsPolicy = simpleCorsResourcePolicy
  { corsOrigins        = Nothing
  , corsMethods        = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
  , corsRequestHeaders = ["Content-Type", "Authorization"]
  }

app :: Connection -> Application
app conn = cors (const (Just corsPolicy)) (serve (Proxy @API) (server conn))