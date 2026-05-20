module Main where

import Network.Wai.Handler.Warp
import Server.Handler

main :: IO ()
main = run 8080 app
