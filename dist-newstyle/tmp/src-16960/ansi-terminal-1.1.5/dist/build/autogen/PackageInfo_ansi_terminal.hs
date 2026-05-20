{-# LANGUAGE NoRebindableSyntax #-}
{-# OPTIONS_GHC -fno-warn-missing-import-lists #-}
{-# OPTIONS_GHC -w #-}
module PackageInfo_ansi_terminal (
    name,
    version,
    synopsis,
    copyright,
    homepage,
  ) where

import Data.Version (Version(..))
import Prelude

name :: String
name = "ansi_terminal"
version :: Version
version = Version [1,1,5] []

synopsis :: String
synopsis = "Simple ANSI terminal support"
copyright :: String
copyright = ""
homepage :: String
homepage = "https://github.com/UnkindPartition/ansi-terminal"
