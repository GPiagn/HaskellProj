{-# LANGUAGE CPP #-}
{-# LANGUAGE NoRebindableSyntax #-}
#if __GLASGOW_HASKELL__ >= 810
{-# OPTIONS_GHC -Wno-prepositive-qualified-module #-}
#endif
{-# OPTIONS_GHC -fno-warn-missing-import-lists #-}
{-# OPTIONS_GHC -w #-}
module Paths_generics_sop (
    version,
    getBinDir, getLibDir, getDynLibDir, getDataDir, getLibexecDir,
    getDataFileName, getSysconfDir
  ) where


import qualified Control.Exception as Exception
import qualified Data.List as List
import Data.Version (Version(..))
import System.Environment (getEnv)
import Prelude


#if defined(VERSION_base)

#if MIN_VERSION_base(4,0,0)
catchIO :: IO a -> (Exception.IOException -> IO a) -> IO a
#else
catchIO :: IO a -> (Exception.Exception -> IO a) -> IO a
#endif

#else
catchIO :: IO a -> (Exception.IOException -> IO a) -> IO a
#endif
catchIO = Exception.catch

version :: Version
version = Version [0,5,1,4] []

getDataFileName :: FilePath -> IO FilePath
getDataFileName name = do
  dir <- getDataDir
  return (dir `joinFileName` name)

getBinDir, getLibDir, getDynLibDir, getDataDir, getLibexecDir, getSysconfDir :: IO FilePath




bindir, libdir, dynlibdir, datadir, libexecdir, sysconfdir :: FilePath
bindir     = "C:\\cabal\\store\\ghc-9.6.7\\generics-sop-0.5.1.4-0c9994ae89f5c30cc82704163c8dd144b8373fe2\\bin"
libdir     = "C:\\cabal\\store\\ghc-9.6.7\\generics-sop-0.5.1.4-0c9994ae89f5c30cc82704163c8dd144b8373fe2\\lib"
dynlibdir  = "C:\\cabal\\store\\ghc-9.6.7\\generics-sop-0.5.1.4-0c9994ae89f5c30cc82704163c8dd144b8373fe2\\lib"
datadir    = "C:\\cabal\\store\\ghc-9.6.7\\generics-sop-0.5.1.4-0c9994ae89f5c30cc82704163c8dd144b8373fe2\\share"
libexecdir = "C:\\cabal\\store\\ghc-9.6.7\\generics-sop-0.5.1.4-0c9994ae89f5c30cc82704163c8dd144b8373fe2\\libexec"
sysconfdir = "C:\\cabal\\store\\ghc-9.6.7\\generics-sop-0.5.1.4-0c9994ae89f5c30cc82704163c8dd144b8373fe2\\etc"

getBinDir     = catchIO (getEnv "generics_sop_bindir")     (\_ -> return bindir)
getLibDir     = catchIO (getEnv "generics_sop_libdir")     (\_ -> return libdir)
getDynLibDir  = catchIO (getEnv "generics_sop_dynlibdir")  (\_ -> return dynlibdir)
getDataDir    = catchIO (getEnv "generics_sop_datadir")    (\_ -> return datadir)
getLibexecDir = catchIO (getEnv "generics_sop_libexecdir") (\_ -> return libexecdir)
getSysconfDir = catchIO (getEnv "generics_sop_sysconfdir") (\_ -> return sysconfdir)



joinFileName :: String -> String -> FilePath
joinFileName ""  fname = fname
joinFileName "." fname = fname
joinFileName dir ""    = dir
joinFileName dir fname
  | isPathSeparator (List.last dir) = dir ++ fname
  | otherwise                       = dir ++ pathSeparator : fname

pathSeparator :: Char
pathSeparator = '\\'

isPathSeparator :: Char -> Bool
isPathSeparator c = c == '/' || c == '\\'
