{-# LANGUAGE NoRebindableSyntax #-}
{-# OPTIONS_GHC -fno-warn-missing-import-lists #-}
{-# OPTIONS_GHC -w #-}
module PackageInfo_dec (
    name,
    version,
    synopsis,
    copyright,
    homepage,
  ) where

import Data.Version (Version(..))
import Prelude

name :: String
name = "dec"
version :: Version
version = Version [0,0,6] []

synopsis :: String
synopsis = "Decidable propositions."
copyright :: String
copyright = "(c) 2019-2021 Oleg Grenrus"
homepage :: String
homepage = "https://github.com/phadej/dec"
