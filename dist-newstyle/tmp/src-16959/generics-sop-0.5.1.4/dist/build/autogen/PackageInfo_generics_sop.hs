{-# LANGUAGE NoRebindableSyntax #-}
{-# OPTIONS_GHC -fno-warn-missing-import-lists #-}
{-# OPTIONS_GHC -w #-}
module PackageInfo_generics_sop (
    name,
    version,
    synopsis,
    copyright,
    homepage,
  ) where

import Data.Version (Version(..))
import Prelude

name :: String
name = "generics_sop"
version :: Version
version = Version [0,5,1,4] []

synopsis :: String
synopsis = "Generic Programming using True Sums of Products"
copyright :: String
copyright = ""
homepage :: String
homepage = ""
