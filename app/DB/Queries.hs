{-# LANGUAGE OverloadedStrings #-}
module DB.Queries where

import Database.PostgreSQL.Simple
import Data.Int (Int64)
import Types.Exemplar

-- Listar todos os exemplares
listExemplares :: Connection -> IO [Exemplar]
listExemplares conn =
  query_ conn
    "SELECT id, codigo, titulo, autor, classificacao, tipo_obra, situacao_sistema \
    \ FROM exemplares ORDER BY id"

-- Buscar exemplar por id
getExemplarById :: Connection -> Int -> IO (Maybe Exemplar)
getExemplarById conn eid = do
  results <- query conn
    "SELECT id, codigo, titulo, autor, classificacao, tipo_obra, situacao_sistema \
    \ FROM exemplares WHERE id = ?"
    (Only eid)
  case results of
    [ex] -> return (Just ex)
    _    -> return Nothing

-- Criar exemplar e retornar o id gerado
insertExemplar :: Connection -> ExemplarInput -> IO (Maybe Int)
insertExemplar conn input = do
  results <- query conn
    "INSERT INTO exemplares (codigo, titulo, autor, classificacao, tipo_obra) \
    \ VALUES (?, ?, ?, ?, ?) RETURNING id"
    input
  case results of
    [Only newId] -> return (Just newId)
    _            -> return Nothing

-- Atualizar exemplar existente (retorna número de linhas afetadas)
updateExemplar :: Connection -> Int -> ExemplarInput -> IO Int64
updateExemplar conn eid (ExemplarInput c t a cl to) =
  execute conn
    "UPDATE exemplares \
    \ SET codigo = ?, titulo = ?, autor = ?, classificacao = ?, tipo_obra = ? \
    \ WHERE id = ?"
    (c, t, a, cl, to, eid)

-- Deletar exemplar (retorna número de linhas afetadas)
deleteExemplar :: Connection -> Int -> IO Int64
deleteExemplar conn eid =
  execute conn "DELETE FROM exemplares WHERE id = ?" (Only eid)