module Server.Handler where

import Data.Proxy
import Network.Wai
import Servant.API.Sub
import Servant.API
import Servant.Server

--ROTAS DO SERVANT
type API = "hello" :> Get '[PlainText] String

--handler para a rota "hello"
handleHello :: Handler String
handleHello = pure "Hello, World!"

server :: Server API
server = handleHello

app :: Application
app = serve (Proxy :: Proxy API) server