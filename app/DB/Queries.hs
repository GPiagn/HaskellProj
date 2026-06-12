{-# LANGUAGE OverloadedStrings #-}
module DB.Queries where

import Database.PostgreSQL.Simple
import Database.PostgreSQL.Simple.FromRow (FromRow, field, fromRow)
import Data.Int  (Int64)
import Data.Text (Text)
import Data.Time (Day)
import Types.Exemplar

-- ============================================================
-- Queries de Exemplares (CRUD)
-- ============================================================

listExemplares :: Connection -> IO [Exemplar]
listExemplares conn =
  query_ conn
    "SELECT e.id, e.codigo, e.titulo, e.autor, e.classificacao, e.tipo_obra, \
    \       e.situacao_sistema, i.resultado \
    \ FROM exemplares e \
    \ LEFT JOIN inventario i \
    \   ON i.exemplar_id = e.id \
    \   AND i.ano_inventario = EXTRACT(YEAR FROM NOW()) \
    \ ORDER BY e.id"

getExemplarById :: Connection -> Int -> IO (Maybe Exemplar)
getExemplarById conn eid = do
  results <- query conn
    "SELECT e.id, e.codigo, e.titulo, e.autor, e.classificacao, e.tipo_obra, \
    \       e.situacao_sistema, i.resultado \
    \ FROM exemplares e \
    \ LEFT JOIN inventario i \
    \   ON i.exemplar_id = e.id \
    \   AND i.ano_inventario = EXTRACT(YEAR FROM NOW()) \
    \ WHERE e.id = ?"
    (Only eid)
  case results of
    [ex] -> return (Just ex)
    _    -> return Nothing

insertExemplar :: Connection -> ExemplarInput -> IO (Maybe Int)
insertExemplar conn input = do
  results <- query conn
    "INSERT INTO exemplares (codigo, titulo, autor, classificacao, tipo_obra) \
    \ VALUES (?, ?, ?, ?, ?) RETURNING id"
    input
  case results of
    [Only newId] -> return (Just newId)
    _            -> return Nothing

updateExemplar :: Connection -> Int -> ExemplarInput -> IO Int64
updateExemplar conn eid (ExemplarInput c t a cl to) =
  execute conn
    "UPDATE exemplares \
    \ SET codigo = ?, titulo = ?, autor = ?, classificacao = ?, tipo_obra = ? \
    \ WHERE id = ?"
    (c, t, a, cl, to, eid)

deleteExemplar :: Connection -> Int -> IO Int64
deleteExemplar conn eid =
  execute conn "DELETE FROM exemplares WHERE id = ?" (Only eid)

-- ============================================================
-- Queries de Inventário
-- ============================================================

-- Registra um inventário. Se já existir registro para esse exemplar no
-- ano atual, atualiza (UPSERT) — graças à UNIQUE constraint do schema.
registrarInventario :: Connection -> Int -> Text -> Maybe Text -> IO Int64
registrarInventario conn eid resultado obs =
  execute conn
    "INSERT INTO inventario (exemplar_id, resultado, observacao) \
    \ VALUES (?, ?, ?) \
    \ ON CONFLICT (exemplar_id, ano_inventario) \
    \ DO UPDATE SET resultado = EXCLUDED.resultado, observacao = EXCLUDED.observacao, registrado_em = NOW()"
    (eid, resultado, obs)

-- ============================================================
-- Tipo auxiliar e queries para "não encontrados"
-- ============================================================

-- Linha bruta vinda do banco para construir um ExemplarNaoEncontrado.
-- Pode ter empréstimo associado (Just) ou não (Nothing).
data NaoEncontradoRow = NaoEncontradoRow
  { rowExemplarId  :: Int
  , rowCodigo      :: Text
  , rowTitulo      :: Text
  , rowObservacao  :: Maybe Text
  , rowNomePessoa  :: Maybe Text
  , rowDataEmp     :: Maybe Day
  , rowDataPrev    :: Maybe Day
  }

instance FromRow NaoEncontradoRow where
  fromRow = NaoEncontradoRow
    <$> field <*> field <*> field <*> field
    <*> field <*> field <*> field

-- Lista os exemplares "não encontrados" no ano atual, fazendo LEFT JOIN
-- com empréstimos para trazer o motivo automático quando aplicável.
listNaoEncontrados :: Connection -> IO [NaoEncontradoRow]
listNaoEncontrados conn =
  query_ conn
    "SELECT e.id, e.codigo, e.titulo, i.observacao, \
    \        emp.nome_pessoa, emp.data_emprestimo, emp.data_prevista \
    \ FROM inventario i \
    \ INNER JOIN exemplares e ON e.id = i.exemplar_id \
    \ LEFT JOIN LATERAL ( \
    \   SELECT nome_pessoa, data_emprestimo, data_prevista \
    \   FROM emprestimos \
    \   WHERE exemplar_id = e.id \
    \   ORDER BY data_emprestimo DESC LIMIT 1 \
    \ ) emp ON TRUE \
    \ WHERE i.resultado = 'nao_encontrado' \
    \   AND i.ano_inventario = EXTRACT(YEAR FROM NOW()) \
    \ ORDER BY e.id"

-- ============================================================
-- Dashboard
-- ============================================================

contarTotais :: Connection -> IO (Int, Int, Int, Int)
contarTotais conn = do
  [Only total]      <- query_ conn "SELECT COUNT(*) FROM exemplares"
  [Only encontrados] <- query_ conn
    "SELECT COUNT(*) FROM inventario \
    \ WHERE resultado = 'encontrado' AND ano_inventario = EXTRACT(YEAR FROM NOW())"
  [Only naoEnc]     <- query_ conn
    "SELECT COUNT(*) FROM inventario \
    \ WHERE resultado = 'nao_encontrado' AND ano_inventario = EXTRACT(YEAR FROM NOW())"
  [Only atrasados]  <- query_ conn
    "SELECT COUNT(*) FROM emprestimos WHERE data_prevista < CURRENT_DATE"
  return (total, encontrados, naoEnc, atrasados)


-- Atualização parcial: campos NULL no input mantêm o valor antigo
patchExemplar :: Connection -> Int -> ExemplarPatch -> IO Int64
patchExemplar conn eid (ExemplarPatch c t a cl to) =
  execute conn
    "UPDATE exemplares \
    \ SET codigo        = COALESCE(?, codigo), \
    \     titulo        = COALESCE(?, titulo), \
    \     autor         = COALESCE(?, autor), \
    \     classificacao = COALESCE(?, classificacao), \
    \     tipo_obra     = COALESCE(?, tipo_obra) \
    \ WHERE id = ?"
    (c, t, a, cl, to, eid)