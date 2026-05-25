{-# LANGUAGE OverloadedStrings #-}
module Business.StatusCalc where

import Data.Time      (Day, diffDays)
import Data.Text      (Text)
import Types.Exemplar

-- Função pura: dada a data de hoje e a data prevista de devolução,
-- retorna se o empréstimo está em dia ou atrasado.
calcSituacao :: Day -> Day -> SituacaoEmprestimo
calcSituacao hoje prevista
  | hoje > prevista = Atrasado (fromIntegral $ diffDays hoje prevista)
  | otherwise       = EmDia

-- Monta o motivo "Emprestado" automaticamente a partir dos dados
-- do empréstimo + a data de hoje (para calcular o atraso).
montaMotivoEmprestado :: Day -> Text -> Day -> Day -> MotivoNaoEncontrado
montaMotivoEmprestado hoje nome dataEmp dataPrev =
  Emprestado
    { nomePessoa     = nome
    , dataEmprestimo = dataEmp
    , dataPrevista   = dataPrev
    , situacao       = calcSituacao hoje dataPrev
    }

-- Validação da regra de negócio: o resultado precisa ser válido
-- e se for "nao_encontrado", precisa ter observação.
validaInventario :: Text -> Maybe Text -> Either Text ()
validaInventario "encontrado"     _              = Right ()
validaInventario "nao_encontrado" (Just _)       = Right ()
validaInventario "nao_encontrado" Nothing        = Left "Observação é obrigatória quando não encontrado"
validaInventario _                _              = Left "Resultado inválido: use 'encontrado' ou 'nao_encontrado'"