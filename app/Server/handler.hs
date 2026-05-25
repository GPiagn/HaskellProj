{-# LANGUAGE DataKinds         #-}
{-# LANGUAGE TypeOperators     #-}
{-# LANGUAGE TypeApplications  #-}
{-# LANGUAGE OverloadedStrings #-}
module Server.Handler where

import Data.Proxy                  (Proxy (..))
import Network.Wai                 (Application)
import Network.Wai.Middleware.Cors
import Servant.API
import Servant.Server
import Data.Aeson                  (Value, object, (.=))
import Database.PostgreSQL.Simple  (Connection)

-- Definição de todas as rotas da API
type API =
       "ping"            :> Get '[JSON] Value
  :<|> "exemplares"      :> Get '[JSON] Value
  :<|> "inventario"      :> Get '[JSON] Value
  :<|> "nao-encontrados" :> Get '[JSON] Value
  :<|> "dashboard"       :> "totais" :> Get '[JSON] Value

-- Server recebe a conexão e repassa para cada handler
server :: Connection -> Server API
server conn =
       handlePing
  :<|> handleExemplares conn
  :<|> handleInventario conn
  :<|> handleNaoEncontrados conn
  :<|> handleDashboard conn

handlePing :: Handler Value
handlePing = return $ object
  [ "status" .= ("ok"         :: String)
  , "msg"    .= ("API online" :: String)
  ]

-- Placeholders — recebem conn mas ainda não usam (fase 2)
handleExemplares :: Connection -> Handler Value
handleExemplares _conn = return $ object
  [ "data"  .= ([] :: [String])
  , "total" .= (0  :: Int)
  ]

handleInventario :: Connection -> Handler Value
handleInventario _conn = return $ object
  [ "data" .= ([] :: [String]) ]

handleNaoEncontrados :: Connection -> Handler Value
handleNaoEncontrados _conn = return $ object
  [ "data" .= ([] :: [String]) ]

handleDashboard :: Connection -> Handler Value
handleDashboard _conn = return $ object
  [ "encontrados"      .= (0 :: Int)
  , "naoEncontrados"   .= (0 :: Int)
  , "naoInventariados" .= (0 :: Int)
  ]

-- CORS
corsPolicy :: CorsResourcePolicy
corsPolicy = simpleCorsResourcePolicy
  { corsOrigins        = Nothing
  , corsMethods        = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
  , corsRequestHeaders = ["Content-Type", "Authorization"]
  }

-- App também recebe a conexão
app :: Connection -> Application
app conn = cors (const (Just corsPolicy)) (serve (Proxy @API) (server conn))