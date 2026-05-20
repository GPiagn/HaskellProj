{-# LANGUAGE NoRebindableSyntax #-}
{-# OPTIONS_GHC -fno-warn-missing-import-lists #-}
{-# OPTIONS_GHC -w #-}
module PackageInfo_vector (
    name,
    version,
    synopsis,
    copyright,
    homepage,
  ) where

import Data.Version (Version(..))
import Prelude

name :: String
name = "vector"
version :: Version
version = Version [0,13,2,0] []

synopsis :: String
synopsis = "Efficient Arrays"
copyright :: String
copyright = "(c) Roman Leshchinskiy 2008-2012,\n    Alexey Kuleshevich 2020-2022,\n    Aleksey Khudyakov 2020-2022,\n    Andrew Lelechenko 2020-2022"
homepage :: String
homepage = "https://github.com/haskell/vector"
