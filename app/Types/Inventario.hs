{-# LANGUAGE DeriveGeneric #-}
module Types.Inventario where

import Data.Aeson    (ToJSON, FromJSON)
import Data.Text     (Text)
import Data.Time     (UTCTime)
import GHC.Generics  (Generic)

data Inventario = Inventario
  { invId           :: Int
  , invExemplarId   :: Int
  , anoInventario   :: Int
  , resultado       :: Text      -- "encontrado" | "nao_encontrado"
  , observacao      :: Maybe Text
  , registradoEm    :: UTCTime
  } deriving (Show, Generic)

instance ToJSON Inventario
instance FromJSON Inventario

-- Payload recebido pelo POST /inventario
data RegistrarInventario = RegistrarInventario
  { regExemplarId :: Int
  , regResultado  :: Text
  , regObservacao :: Maybe Text
  } deriving (Show, Generic)

instance ToJSON RegistrarInventario
instance FromJSON RegistrarInventario