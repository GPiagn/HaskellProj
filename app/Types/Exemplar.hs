{-# LANGUAGE DeriveGeneric     #-}
{-# LANGUAGE OverloadedStrings #-}
module Types.Exemplar where

import Data.Aeson    (ToJSON, FromJSON)
import Data.Text     (Text)
import GHC.Generics  (Generic)
import Database.PostgreSQL.Simple.FromRow (FromRow, field, fromRow)
import Database.PostgreSQL.Simple.ToRow   (ToRow, toRow)
import Database.PostgreSQL.Simple.ToField (toField)

-- Exemplar do acervo bibliográfico
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

-- Como ler um exemplar de uma linha do banco
instance FromRow Exemplar where
  fromRow = Exemplar <$> field <*> field <*> field <*> field <*> field <*> field <*> field

-- Payload para criar/atualizar um exemplar (sem id, sem situacaoSistema)
data ExemplarInput = ExemplarInput
  { inpCodigo        :: Text
  , inpTitulo        :: Text
  , inpAutor         :: Maybe Text
  , inpClassificacao :: Maybe Text
  , inpTipoObra      :: Maybe Text
  } deriving (Show, Generic)

instance ToJSON ExemplarInput
instance FromJSON ExemplarInput

-- Como escrever um ExemplarInput nas colunas do banco
instance ToRow ExemplarInput where
  toRow (ExemplarInput c t a cl to) =
    [toField c, toField t, toField a, toField cl, toField to]