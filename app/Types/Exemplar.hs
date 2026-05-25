{-# LANGUAGE DeriveGeneric #-}
{-# LANGUAGE OverloadedStrings #-}
module Types.Exemplar where

import Data.Aeson (ToJSON, FromJSON)
import Data.Text  (Text)
import Data.Time  (Day)
import GHC.Generics (Generic)

-- Status binário do inventário
data ResultadoInventario
  = Encontrado { obsEncontrado :: Maybe Text }
  | NaoEncontrado { motivo :: MotivoNaoEncontrado }
  deriving (Show, Generic)

instance ToJSON ResultadoInventario
instance FromJSON ResultadoInventario

data MotivoNaoEncontrado
  = Emprestado
      { nomePessoa      :: Text
      , dataEmprestimo  :: Day
      , dataPrevista    :: Day
      , situacao        :: SituacaoEmprestimo
      }
  | OutroMotivo { descricao :: Text }
  deriving (Show, Generic)

instance ToJSON MotivoNaoEncontrado
instance FromJSON MotivoNaoEncontrado

data SituacaoEmprestimo
  = EmDia
  | Atrasado { diasAtraso :: Int }
  deriving (Show, Generic)

instance ToJSON SituacaoEmprestimo
instance FromJSON SituacaoEmprestimo

-- Representação de um exemplar do acervo
data Exemplar = Exemplar
  { exemplarId      :: Int
  , codigo          :: Text
  , titulo          :: Text
  , autor           :: Text
  , classificacao   :: Text
  , tipoObra        :: Text
  , situacaoSistema :: Text
  } deriving (Show, Generic)

instance ToJSON Exemplar
instance FromJSON Exemplar