{-# LANGUAGE DeriveGeneric     #-}
{-# LANGUAGE OverloadedStrings #-}
module Types.Exemplar where

import Data.Aeson    (ToJSON, FromJSON)
import Data.Text     (Text)
import Data.Time     (Day)
import GHC.Generics  (Generic)
import Database.PostgreSQL.Simple.FromRow (FromRow, field, fromRow)
import Database.PostgreSQL.Simple.ToRow   (ToRow, toRow)
import Database.PostgreSQL.Simple.ToField (toField)

-- ============================================================
-- Exemplar (CRUD)
-- ============================================================

data Exemplar = Exemplar
  { exemplarId      :: Int
  , codigo          :: Text
  , titulo          :: Text
  , autor           :: Maybe Text
  , classificacao   :: Maybe Text
  , tipoObra        :: Maybe Text
  , situacaoSistema :: Maybe Text
  } deriving (Show, Generic)

instance ToJSON Exemplar
instance FromJSON Exemplar

instance FromRow Exemplar where
  fromRow = Exemplar <$> field <*> field <*> field <*> field <*> field <*> field <*> field

data ExemplarInput = ExemplarInput
  { inpCodigo        :: Text
  , inpTitulo        :: Text
  , inpAutor         :: Maybe Text
  , inpClassificacao :: Maybe Text
  , inpTipoObra      :: Maybe Text
  } deriving (Show, Generic)

instance ToJSON ExemplarInput
instance FromJSON ExemplarInput

instance ToRow ExemplarInput where
  toRow (ExemplarInput c t a cl to) =
    [toField c, toField t, toField a, toField cl, toField to]

-- ============================================================
-- Regras de negócio do inventário
-- ============================================================

-- Para empréstimos: em dia ou atrasado
data SituacaoEmprestimo
  = EmDia
  | Atrasado { diasAtraso :: Int }
  deriving (Show, Generic)

instance ToJSON SituacaoEmprestimo
instance FromJSON SituacaoEmprestimo

-- Quando "não encontrado", explica o porquê
data MotivoNaoEncontrado
  = Emprestado
      { nomePessoa     :: Text
      , dataEmprestimo :: Day
      , dataPrevista   :: Day
      , situacao       :: SituacaoEmprestimo
      }
  | OutroMotivo { descricao :: Text }
  deriving (Show, Generic)

instance ToJSON MotivoNaoEncontrado
instance FromJSON MotivoNaoEncontrado

-- Item da lista de não encontrados (junção exemplar + motivo)
data ExemplarNaoEncontrado = ExemplarNaoEncontrado
  { neExemplarId :: Int
  , neCodigo     :: Text
  , neTitulo     :: Text
  , neMotivo     :: MotivoNaoEncontrado
  } deriving (Show, Generic)

instance ToJSON ExemplarNaoEncontrado
instance FromJSON ExemplarNaoEncontrado

-- Payload para registrar um inventário (POST /inventario)
data InventarioInput = InventarioInput
  { invExemplarId :: Int
  , invResultado  :: Text       -- "encontrado" ou "nao_encontrado"
  , invObservacao :: Maybe Text
  } deriving (Show, Generic)

instance ToJSON InventarioInput
instance FromJSON InventarioInput

-- Totais do dashboard
data DashboardTotais = DashboardTotais
  { totalExemplares      :: Int
  , totalEncontrados     :: Int
  , totalNaoEncontrados  :: Int
  , totalNaoInventariados :: Int
  , totalEmprestimosAtrasados :: Int
  } deriving (Show, Generic)

instance ToJSON DashboardTotais
instance FromJSON DashboardTotais

-- Payload para PATCH (atualização parcial — todos os campos opcionais)
data ExemplarPatch = ExemplarPatch
  { patCodigo        :: Maybe Text
  , patTitulo        :: Maybe Text
  , patAutor         :: Maybe Text
  , patClassificacao :: Maybe Text
  , patTipoObra      :: Maybe Text
  } deriving (Show, Generic)

instance ToJSON ExemplarPatch
instance FromJSON ExemplarPatch