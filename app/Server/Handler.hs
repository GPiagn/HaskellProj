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
import Database.PostgreSQL.Simple   (Connection)

import Types.Exemplar
import qualified DB.Queries as DB
import Business.StatusCalc

-- ============================================================
-- Definição das rotas
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
  :<|> "nao-encontrados" :> Get '[JSON] [ExemplarNaoEncontrado]
  :<|> "dashboard" :> "totais" :> Get '[JSON] DashboardTotais
  -- Saúde
  :<|> "ping" :> Get '[JSON] Value

server :: Connection -> Server API
server conn =
       handleListExemplares   conn
  :<|> handleGetExemplar      conn
  :<|> handleCreateExemplar   conn
  :<|> handleUpdateExemplar   conn
  :<|> handlePatchExemplar    conn
  :<|> handleDeleteExemplar   conn
  :<|> handleRegistrarInventario conn
  :<|> handleNaoEncontrados   conn
  :<|> handleDashboard        conn
  :<|> handlePing

-- ============================================================
-- Handlers — Exemplares
-- ============================================================

handleListExemplares :: Connection -> Handler [Exemplar]
handleListExemplares conn = liftIO (DB.listExemplares conn)

handleGetExemplar :: Connection -> Int -> Handler Exemplar
handleGetExemplar conn eid = do
  result <- liftIO (DB.getExemplarById conn eid)
  case result of
    Just ex -> return ex
    Nothing -> throwError err404 { errBody = "Exemplar não encontrado" }

handleCreateExemplar :: Connection -> ExemplarInput -> Handler Value
handleCreateExemplar conn input = do
  result <- liftIO (DB.insertExemplar conn input)
  case result of
    Just newId -> return $ object
      [ "id"  .= newId
      , "msg" .= ("Exemplar criado com sucesso" :: String)
      ]
    Nothing -> throwError err500 { errBody = "Erro ao criar exemplar" }

handleUpdateExemplar :: Connection -> Int -> ExemplarInput -> Handler Value
handleUpdateExemplar conn eid input = do
  affected <- liftIO (DB.updateExemplar conn eid input)
  if affected > 0
    then return $ object
      [ "id"  .= eid
      , "msg" .= ("Exemplar atualizado com sucesso" :: String)
      ]
    else throwError err404 { errBody = "Exemplar não encontrado" }

handleDeleteExemplar :: Connection -> Int -> Handler Value
handleDeleteExemplar conn eid = do
  affected <- liftIO (DB.deleteExemplar conn eid)
  if affected > 0
    then return $ object
      [ "id"  .= eid
      , "msg" .= ("Exemplar removido com sucesso" :: String)
      ]
    else throwError err404 { errBody = "Exemplar não encontrado" }

handlePatchExemplar :: Connection -> Int -> ExemplarPatch -> Handler Value
handlePatchExemplar conn eid input = do
  affected <- liftIO (DB.patchExemplar conn eid input)
  if affected > 0
    then return $ object
      [ "id"  .= eid
      , "msg" .= ("Exemplar atualizado parcialmente com sucesso" :: String)
      ]
    else throwError err404 { errBody = "Exemplar não encontrado" }

-- ============================================================
-- Handlers — Inventário (regra de negócio)
-- ============================================================

handleRegistrarInventario :: Connection -> InventarioInput -> Handler Value
handleRegistrarInventario conn (InventarioInput eid resultado obs) =
  case validaInventario resultado obs of
    Left erro -> throwError err400 { errBody = "Erro de validação" }
    Right ()  -> do
      affected <- liftIO (DB.registrarInventario conn eid resultado obs)
      return $ object
        [ "exemplarId" .= eid
        , "resultado"  .= resultado
        , "msg"        .= ("Inventário registrado com sucesso" :: String)
        , "linhas"     .= affected
        ]

handleNaoEncontrados :: Connection -> Handler [ExemplarNaoEncontrado]
handleNaoEncontrados conn = do
  rows <- liftIO (DB.listNaoEncontrados conn)
  hoje <- liftIO (utctDay <$> getCurrentTime)
  return (map (toNaoEncontrado hoje) rows)

-- Função pura que converte uma linha do banco no tipo de domínio.
-- Aqui é onde a lógica de negócio aparece: se tem empréstimo associado,
-- monta o motivo "Emprestado" automaticamente com cálculo de atraso.
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

handleDashboard :: Connection -> Handler DashboardTotais
handleDashboard conn = do
  (total, enc, naoEnc, atrasados) <- liftIO (DB.contarTotais conn)
  return DashboardTotais
    { totalExemplares           = total
    , totalEncontrados          = enc
    , totalNaoEncontrados       = naoEnc
    , totalNaoInventariados     = total - enc - naoEnc
    , totalEmprestimosAtrasados = atrasados
    }

-- ============================================================
-- Healthcheck
-- ============================================================

handlePing :: Handler Value
handlePing = return $ object
  [ "status" .= ("ok"         :: String)
  , "msg"    .= ("API online" :: String)
  ]

-- ============================================================
-- CORS + app
-- ============================================================

corsPolicy :: CorsResourcePolicy
corsPolicy = simpleCorsResourcePolicy
  { corsOrigins        = Nothing
  , corsMethods        = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
  , corsRequestHeaders = ["Content-Type", "Authorization"]
  }

app :: Connection -> Application
app conn = cors (const (Just corsPolicy)) (serve (Proxy @API) (server conn))