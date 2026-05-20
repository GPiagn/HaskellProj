{-# OPTIONS_GHC -optc-DWINVER=0x0600 #-}
{-# OPTIONS_GHC -optc-D_WIN32_WINNT=0x0600 #-}
{-# LINE 1 "win\\System\\Console\\ANSI\\Windows\\Win32\\MinTTY.hsc" #-}
{-# LANGUAGE Safe                #-}
{-# LANGUAGE ScopedTypeVariables #-}

{-| This module is based on the corresponding code in the mintty package and the
Win32 package, in order to avoid a dependency on those packages.
-}
module System.Console.ANSI.Windows.Win32.MinTTY
  ( isMinTTYHandle
  ) where

import Control.Exception ( catch )
import Data.Int ( Int32 )
import Data.List ( isInfixOf )
import Data.Word ( Word8 )
import Foreign.C.String
         ( peekCWStringLen, withCAString, withCWString, withCWStringLen )
import Foreign.C.Types ( CInt (..) )
import Foreign.Marshal.Alloc ( alloca, allocaBytes )
import Foreign.Marshal.Array ( advancePtr, copyArray )
import Foreign.Marshal.Utils ( maybeWith )
import Foreign.Ptr ( FunPtr, Ptr, castPtr, castPtrToFunPtr, plusPtr )
import Foreign.Storable ( Storable (..) )

-- Provided by the ansi-terminal package
import System.Console.ANSI.Windows.Win32.Types
         ( Addr, BOOL, DWORD, FileType, HANDLE, HMODULE, LPCSTR, LPCTSTR, LPTSTR
         , TCHAR, ULONG, USHORT, failIfFalse_, failIfNeg, failIfNull
         )

-- The headers that are shipped with GHC's copy of MinGW-w64 assume Windows XP.
-- Since we need some structs that are only available with Vista or later,
-- we must manually set WINVER/_WIN32_WINNT accordingly.








{-# LINE 43 "win\\System\\Console\\ANSI\\Windows\\Win32\\MinTTY.hsc" #-}

type F_NtQueryObject =
     HANDLE
  -> CInt
  -> Ptr OBJECT_NAME_INFORMATION
  -> ULONG
  -> Ptr ULONG
  -> IO NTSTATUS
type F_GetFileInformationByHandleEx =
  HANDLE -> CInt -> Ptr FILE_NAME_INFO -> DWORD -> IO BOOL
type NTSTATUS = Int32
{-# LINE 54 "win\\System\\Console\\ANSI\\Windows\\Win32\\MinTTY.hsc" #-}

data FILE_NAME_INFO = FILE_NAME_INFO
  { fniFileNameLength :: DWORD
  , fniFileName :: String
  }

instance Storable FILE_NAME_INFO where
  sizeOf _ = (8)
{-# LINE 62 "win\\System\\Console\\ANSI\\Windows\\Win32\\MinTTY.hsc" #-}
  alignment _ = 4
{-# LINE 63 "win\\System\\Console\\ANSI\\Windows\\Win32\\MinTTY.hsc" #-}
  poke buf fni = withTStringLen (fniFileName fni) $ \(str, len) -> do
    let len' = (min mAX_PATH len) * sizeOfTCHAR
        start = advancePtr (castPtr buf) ((4))
{-# LINE 66 "win\\System\\Console\\ANSI\\Windows\\Win32\\MinTTY.hsc" #-}
        end = advancePtr start len'
    ((\hsc_ptr -> pokeByteOff hsc_ptr 0)) buf len'
{-# LINE 68 "win\\System\\Console\\ANSI\\Windows\\Win32\\MinTTY.hsc" #-}
    copyArray start (castPtr str :: Ptr Word8) len'
    poke (castPtr end) (0 :: TCHAR)
  peek buf = do
    vfniFileNameLength <- ((\hsc_ptr -> peekByteOff hsc_ptr 0)) buf
{-# LINE 72 "win\\System\\Console\\ANSI\\Windows\\Win32\\MinTTY.hsc" #-}
    let len = fromIntegral vfniFileNameLength `div` sizeOfTCHAR
    vfniFileName <-
      peekTStringLen (plusPtr buf ((4)), len)
{-# LINE 75 "win\\System\\Console\\ANSI\\Windows\\Win32\\MinTTY.hsc" #-}
    pure $ FILE_NAME_INFO
      { fniFileNameLength = vfniFileNameLength
      , fniFileName = vfniFileName
      }

newtype OBJECT_NAME_INFORMATION = OBJECT_NAME_INFORMATION
  { oniName :: UNICODE_STRING }

instance Storable OBJECT_NAME_INFORMATION where
  sizeOf _ = (16)
{-# LINE 85 "win\\System\\Console\\ANSI\\Windows\\Win32\\MinTTY.hsc" #-}
  alignment _ = 8
{-# LINE 86 "win\\System\\Console\\ANSI\\Windows\\Win32\\MinTTY.hsc" #-}
  poke buf oni = ((\hsc_ptr -> pokeByteOff hsc_ptr 0)) buf (oniName oni)
{-# LINE 87 "win\\System\\Console\\ANSI\\Windows\\Win32\\MinTTY.hsc" #-}
  peek buf =
    fmap OBJECT_NAME_INFORMATION $ ((\hsc_ptr -> peekByteOff hsc_ptr 0)) buf
{-# LINE 89 "win\\System\\Console\\ANSI\\Windows\\Win32\\MinTTY.hsc" #-}

data UNICODE_STRING = UNICODE_STRING
  { usLength :: USHORT
  , usMaximumLength :: USHORT
  , usBuffer :: String
  }

instance Storable UNICODE_STRING where
  sizeOf _ = (16)
{-# LINE 98 "win\\System\\Console\\ANSI\\Windows\\Win32\\MinTTY.hsc" #-}
  alignment _ = 8
{-# LINE 99 "win\\System\\Console\\ANSI\\Windows\\Win32\\MinTTY.hsc" #-}
  poke buf us = withTStringLen (usBuffer us) $ \(str, len) -> do
    let len' = (min mAX_PATH len) * sizeOfTCHAR
        start = advancePtr (castPtr buf) ((16))
{-# LINE 102 "win\\System\\Console\\ANSI\\Windows\\Win32\\MinTTY.hsc" #-}
        end = advancePtr start len'
    ((\hsc_ptr -> pokeByteOff hsc_ptr 0)) buf len'
{-# LINE 104 "win\\System\\Console\\ANSI\\Windows\\Win32\\MinTTY.hsc" #-}
    ((\hsc_ptr -> pokeByteOff hsc_ptr 2)) buf (len' + sizeOfTCHAR)
{-# LINE 105 "win\\System\\Console\\ANSI\\Windows\\Win32\\MinTTY.hsc" #-}
    ((\hsc_ptr -> pokeByteOff hsc_ptr 8)) buf start
{-# LINE 106 "win\\System\\Console\\ANSI\\Windows\\Win32\\MinTTY.hsc" #-}
    copyArray start (castPtr str :: Ptr Word8) len'
    poke (castPtr end) (0 :: TCHAR)
  peek buf = do
    vusLength <- ((\hsc_ptr -> peekByteOff hsc_ptr 0)) buf
{-# LINE 110 "win\\System\\Console\\ANSI\\Windows\\Win32\\MinTTY.hsc" #-}
    vusMaximumLength <- ((\hsc_ptr -> peekByteOff hsc_ptr 2)) buf
{-# LINE 111 "win\\System\\Console\\ANSI\\Windows\\Win32\\MinTTY.hsc" #-}
    vusBufferPtr <- ((\hsc_ptr -> peekByteOff hsc_ptr 8)) buf
{-# LINE 112 "win\\System\\Console\\ANSI\\Windows\\Win32\\MinTTY.hsc" #-}
    let len = fromIntegral vusLength `div` sizeOfTCHAR
    vusBuffer <- peekTStringLen (vusBufferPtr, len)
    pure $ UNICODE_STRING
      { usLength = vusLength
      , usMaximumLength = vusMaximumLength
      , usBuffer = vusBuffer
      }

-- | Returns 'True' is the given handle is attached to a MinTTY console
-- (e.g., Cygwin or MSYS). Returns 'False' otherwise.
isMinTTYHandle :: HANDLE -> IO Bool
isMinTTYHandle h = do
  fileType <- getFileType h
  if fileType /= fILE_TYPE_PIPE
    then pure False
    else isMinTTYVista h `catch` \(_ :: IOError) -> isMinTTYCompat h
    -- GetFileNameByHandleEx is only available on Vista and later (hence
    -- the name isMinTTYVista). If we're on an older version of Windows,
    -- getProcAddress will throw an IOException when it fails to find
    -- GetFileNameByHandleEx, and thus we will default to using
    -- NtQueryObject (isMinTTYCompat).

isMinTTYVista :: HANDLE -> IO Bool
isMinTTYVista h = do
    fn <- getFileNameByHandle h
    pure $ cygwinMSYSCheck fn
  `catch` \(_ :: IOError) -> pure False

cygwinMSYSCheck :: String -> Bool
cygwinMSYSCheck fn =
     ("cygwin-" `isInfixOf` fn || "msys-" `isInfixOf` fn)
  && "-pty" `isInfixOf` fn
-- Note that GetFileInformationByHandleEx might return a filepath like:
--
--    \msys-dd50a72ab4668b33-pty1-to-master
--
-- But NtQueryObject might return something like:
--
--    \Device\NamedPipe\msys-dd50a72ab4668b33-pty1-to-master
--
-- This means we can't rely on "\cygwin-" or "\msys-" being at the very start
-- of the filepath. As a result, we use `isPrefixOf` to check for "cygwin" and
-- "msys".
--
-- It's unclear if "-master" will always appear in the filepath name. Recent
-- versions of MinTTY have been known to give filepaths like this (#186):
--
--    \msys-dd50a72ab4668b33-pty0-to-master-nat
--
-- Just in case MinTTY ever changes this convention, we don't bother checking
-- for the presence of "-master" in the filepath name at all.

isMinTTYCompat :: HANDLE -> IO Bool
isMinTTYCompat h = do
    fn <- ntQueryObjectNameInformation h
    pure $ cygwinMSYSCheck fn
  `catch` \(_ :: IOError) -> pure False

fILE_TYPE_PIPE :: FileType
fILE_TYPE_PIPE = 3

ntQueryObjectNameInformation :: HANDLE -> IO String
ntQueryObjectNameInformation h = do
  let sizeOfONI = sizeOf (undefined :: OBJECT_NAME_INFORMATION)
      bufSize   = sizeOfONI + mAX_PATH * sizeOfTCHAR
  allocaBytes bufSize $ \buf ->
    alloca $ \p_len -> do
      hwnd <- getModuleHandle (Just "ntdll.exe")
      addr <- getProcAddress hwnd "NtQueryObject"
      let c_NtQueryObject = mk_NtQueryObject (castPtrToFunPtr addr)
      _ <- failIfNeg "NtQueryObject" $ c_NtQueryObject
             h objectNameInformation buf (fromIntegral bufSize) p_len
      oni <- peek buf
      pure $ usBuffer $ oniName oni

sizeOfTCHAR :: Int
sizeOfTCHAR = sizeOf (undefined :: TCHAR)

getFileNameByHandle :: HANDLE -> IO String
getFileNameByHandle h = do
  let sizeOfDWORD = sizeOf (undefined :: DWORD)
      -- note: implicitly assuming that DWORD has stronger alignment than wchar_t
      bufSize     = sizeOfDWORD + mAX_PATH * sizeOfTCHAR
  allocaBytes bufSize $ \buf -> do
    getFileInformationByHandleEx h fileNameInfo buf (fromIntegral bufSize)
    fni <- peek buf
    pure $ fniFileName fni

getFileInformationByHandleEx ::
     HANDLE
  -> CInt
  -> Ptr FILE_NAME_INFO
  -> DWORD
  -> IO ()
getFileInformationByHandleEx h cls buf bufSize = do
  lib <- getModuleHandle (Just "kernel32.dll")
  ptr <- getProcAddress lib "GetFileInformationByHandleEx"
  let c_GetFileInformationByHandleEx =
        mk_GetFileInformationByHandleEx (castPtrToFunPtr ptr)
  failIfFalse_ "getFileInformationByHandleEx"
    (c_GetFileInformationByHandleEx h cls buf bufSize)

getModuleHandle :: Maybe String -> IO HMODULE
getModuleHandle mb_name =
  maybeWith withTString mb_name $ \ c_name ->
  failIfNull "GetModuleHandle" $ c_GetModuleHandle c_name

getProcAddress :: HMODULE -> String -> IO Addr
getProcAddress hmod procname =
  withCAString procname $ \ c_procname ->
  failIfNull "GetProcAddress" $ c_GetProcAddress hmod c_procname

peekTStringLen :: (LPCTSTR, Int) -> IO String
peekTStringLen = peekCWStringLen

withTString :: String -> (LPTSTR -> IO a) -> IO a
withTString = withCWString

withTStringLen :: String -> ((LPTSTR, Int) -> IO a) -> IO a
withTStringLen = withCWStringLen

fileNameInfo :: CInt
fileNameInfo = 2
{-# LINE 235 "win\\System\\Console\\ANSI\\Windows\\Win32\\MinTTY.hsc" #-}

mAX_PATH :: Num a => a
mAX_PATH = 260
{-# LINE 238 "win\\System\\Console\\ANSI\\Windows\\Win32\\MinTTY.hsc" #-}

objectNameInformation :: CInt
objectNameInformation = 1
{-# LINE 241 "win\\System\\Console\\ANSI\\Windows\\Win32\\MinTTY.hsc" #-}

foreign import ccall "dynamic"
  mk_GetFileInformationByHandleEx ::
    FunPtr F_GetFileInformationByHandleEx -> F_GetFileInformationByHandleEx

foreign import ccall unsafe "windows.h GetFileType"
  getFileType :: HANDLE -> IO FileType

foreign import ccall unsafe "windows.h GetProcAddress"
  c_GetProcAddress :: HMODULE -> LPCSTR -> IO Addr

foreign import ccall "dynamic"
  mk_NtQueryObject :: FunPtr F_NtQueryObject -> F_NtQueryObject

foreign import ccall unsafe "windows.h GetModuleHandleW"
  c_GetModuleHandle :: LPCTSTR -> IO HMODULE
