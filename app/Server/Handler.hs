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
import Data.Time                    (Day, getCurrentTime, utctDay)
import Data.Pool                    (Pool, withResource)
import Database.PostgreSQL.Simple   (Connection)
import Data.Text                    (Text) -- Importado para dar suporte às novas rotas

import Types.Exemplar
import qualified DB.Queries as DB
import Business.StatusCalc

-- ============================================================
-- Definição das rotas da API
-- ============================================================

type API =
  -- Exemplares (CRUD)
       "exemplares" :> Get '[JSON] [Exemplar]
  :<|> "exemplares" :> Capture "id" Int :> Get '[JSON] Exemplar
  :<|> "exemplares" :> ReqBody '[JSON] ExemplarInput :> Post '[JSON] Value
  :<|> "exemplares" :> Capture "id" Int :> ReqBody '[JSON] ExemplarInput :> Put '[JSON] Value
  :<|> "exemplares" :> Capture "id" Int :> ReqBody '[JSON] ExemplarPatch :> Patch '[JSON] Value
  :<|> "exemplares" :> Capture "id" Int :> Delete '[JSON] Value
  -- Inventário e regra de negócio
  :<|> "inventario" :> ReqBody '[JSON] InventarioInput :> Post '[JSON] Value
  :<|> "emprestimos" :> ReqBody '[JSON] EmprestimoInput :> Post '[JSON] Value
  :<|> "nao-encontrados" :> Get '[JSON] [ExemplarNaoEncontrado]
  :<|> "dashboard" :> "totais" :> Get '[JSON] DashboardTotais
  -- Novas rotas para alimentar os Menus Suspensos (Dropdowns)
  :<|> "autores" :> Get '[JSON] [Text]
  :<|> "titulos" :> Get '[JSON] [Text]
  :<|> "acervos" :> Get '[JSON] [Int]
  -- Saúde
  :<|> "ping" :> Get '[JSON] Value

-- Vincula os endpoints aos Handlers usando o Pool de Conexões
server :: Pool Connection -> Server API
server pool =
       handleListExemplares   pool
  :<|> handleGetExemplar      pool
  :<|> handleCreateExemplar   pool
  :<|> handleUpdateExemplar   pool
  :<|> handlePatchExemplar    pool
  :<|> handleDeleteExemplar   pool
  :<|> handleRegistrarInventario pool
  :<|> handleRegistrarEmprestimo pool
  :<|> handleNaoEncontrados   pool
  :<|> handleDashboard        pool
  :<|> handleListAutores      pool
  :<|> handleListTitulos      pool
  :<|> handleListAcervos      pool
  :<|> handlePing

-- ============================================================
-- Handlers — Exemplares
-- ============================================================

handleListExemplares :: Pool Connection -> Handler [Exemplar]
handleListExemplares pool = liftIO $ withResource pool $ \conn -> DB.listExemplares conn

handleGetExemplar :: Pool Connection -> Int -> Handler Exemplar
handleGetExemplar pool eid = do
  result <- liftIO $ withResource pool $ \conn -> DB.getExemplarById conn eid
  case result of
    Just ex -> return ex
    Nothing -> throwError err404 { errBody = "Exemplar não encontrado" }

handleCreateExemplar :: Pool Connection -> ExemplarInput -> Handler Value
handleCreateExemplar pool input = do
  result <- liftIO $ withResource pool $ \conn -> DB.insertExemplar conn input
  case result of
    Just newId -> return $ object
      [ "id"  .= newId
      , "msg" .= ("Exemplar criado com sucesso" :: String)
      ]
    Nothing -> throwError err500 { errBody = "Erro ao criar exemplar" }

handleUpdateExemplar :: Pool Connection -> Int -> ExemplarInput -> Handler Value
handleUpdateExemplar pool eid input = do
  affected <- liftIO $ withResource pool $ \conn -> DB.updateExemplar conn eid input
  if affected > 0
    then return $ object
      [ "id"  .= eid
      , "msg" .= ("Exemplar atualizado com sucesso" :: String)
      ]
    else throwError err404 { errBody = "Exemplar não encontrado" }

handleDeleteExemplar :: Pool Connection -> Int -> Handler Value
handleDeleteExemplar pool eid = do
  affected <- liftIO $ withResource pool $ \conn -> DB.deleteExemplar conn eid
  if affected > 0
    then return $ object
      [ "id"  .= eid
      , "msg" .= ("Exemplar removido com sucesso" :: String)
      ]
    else throwError err404 { errBody = "Exemplar não encontrado" }

handlePatchExemplar :: Pool Connection -> Int -> ExemplarPatch -> Handler Value
handlePatchExemplar pool eid input = do
  affected <- liftIO $ withResource pool $ \conn -> DB.patchExemplar conn eid input
  if affected > 0
    then return $ object
      [ "id"  .= eid
      , "msg" .= ("Exemplar atualizado parcialmente com sucesso" :: String)
      ]
    else throwError err404 { errBody = "Exemplar não encontrado" }

-- ============================================================
-- Handlers — Inventário (regra de negócio)
-- ============================================================

handleRegistrarInventario :: Pool Connection -> InventarioInput -> Handler Value
handleRegistrarInventario pool (InventarioInput eid resultado obs) =
  case validaInventario resultado obs of
    Left erro -> throwError err400 { errBody = "Erro de validação" }
    Right ()  -> do
      affected <- liftIO $ withResource pool $ \conn -> DB.registrarInventario conn eid resultado obs
      return $ object
        [ "exemplarId" .= eid
        , "resultado"  .= resultado
        , "msg"        .= ("Inventário registrado com sucesso" :: String)
        , "linhas"     .= affected
        ]

handleRegistrarEmprestimo :: Pool Connection -> EmprestimoInput -> Handler Value
handleRegistrarEmprestimo pool (EmprestimoInput eid nome dEmp dPrev) = do
  affected <- liftIO $ withResource pool $ \conn -> DB.registrarEmprestimo conn eid nome dEmp dPrev
  return $ object
    [ "exemplarId" .= eid
    , "msg"        .= ("Empréstimo registrado com sucesso" :: String)
    , "linhas"     .= affected
    ]

handleNaoEncontrados :: Pool Connection -> Handler [ExemplarNaoEncontrado]
handleNaoEncontrados pool = do
  rows <- liftIO $ withResource pool $ \conn -> DB.listNaoEncontrados conn
  hoje <- liftIO (utctDay <$> getCurrentTime)
  return (map (toNaoEncontrado hoje) rows)

toNaoEncontrado :: Day -> DB.NaoEncontradoRow -> ExemplarNaoEncontrado
toNaoEncontrado hoje row =
  ExemplarNaoEncontrado
    { neExemplarId = DB.rowExemplarId row
    , neCodigo     = DB.rowCodigo row
    , neTitulo     = DB.rowTitulo row
    , neMotivo     = decidirMotivo
    }
  where
    decidirMotivo = case (DB.rowNomePessoa row, DB.rowDataEmp row, DB.rowDataPrev row) of
      (Just nome, Just dEmp, Just dPrev) ->
        montaMotivoEmprestado hoje nome dEmp dPrev
      _ ->
        OutroMotivo (maybe "Motivo não informado" id (DB.rowObservacao row))

handleDashboard :: Pool Connection -> Handler DashboardTotais
handleDashboard pool = do
  (total, enc, naoEnc, atrasados) <- liftIO $ withResource pool $ \conn -> DB.contarTotais conn
  return DashboardTotais
    { totalExemplares           = total
    , totalEncontrados          = enc
    , totalNaoEncontrados       = naoEnc
    , totalNaoInventariados     = total - enc - naoEnc
    , totalEmprestimosAtrasados = atrasados
    }

-- ============================================================
-- Handlers — Auxiliares para Menus Suspensos (Dropdowns)
-- ============================================================

handleListAutores :: Pool Connection -> Handler [Text]
handleListAutores pool = liftIO $ withResource pool $ \conn -> DB.listUniqueAutores conn

handleListTitulos :: Pool Connection -> Handler [Text]
handleListTitulos pool = liftIO $ withResource pool $ \conn -> DB.listUniqueTitulos conn

handleListAcervos :: Pool Connection -> Handler [Int]
handleListAcervos pool = liftIO $ withResource pool $ \conn -> DB.listUniqueAcervos conn

-- ============================================================
-- Healthcheck
-- ============================================================

handlePing :: Handler Value
handlePing = return $ object
  [ "status" .= ("ok"         :: String)
  , "msg"    .= ("API online" :: String)
  ]

-- ============================================================
-- CORS + Inicialização do App
-- ============================================================

corsPolicy :: CorsResourcePolicy
corsPolicy = simpleCorsResourcePolicy
  { corsOrigins        = Nothing
  , corsMethods        = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
  , corsRequestHeaders = ["Content-Type", "Authorization"]
  }

app :: Pool Connection -> Application
app pool = cors (const (Just corsPolicy)) (serve (Proxy @API) (server pool))