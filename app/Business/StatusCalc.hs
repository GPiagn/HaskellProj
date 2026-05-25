module Business.StatusCalc where

{-import Data.Text (Text, pack)
import Data.Time     (Day, diffDays)
import Types.Exemplar

-- Calcula se um empréstimo está em dia ou atrasado
-- Função pura: sem IO, sem banco, sem efeitos colaterais
calcSituacao :: Day -> Day -> SituacaoEmprestimo
calcSituacao hoje prevista
  | hoje > prevista = Atrasado (fromIntegral $ diffDays hoje prevista)
  | otherwise       = EmDia

-- Monta a observação automática para exemplar emprestado não encontrado
obsEmprestado :: Day -> Day -> Day -> String -> MotivoNaoEncontrado
obsEmprestado hoje dataEmp dataPrev nome =
  Emprestado
    { nomePessoa     = pack nome
    , dataEmprestimo = dataEmp
    , dataPrevista   = dataPrev
    , situacao       = calcSituacao hoje dataPrev
    }
-}