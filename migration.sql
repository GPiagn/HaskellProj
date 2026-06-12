CREATE TABLE IF NOT EXISTS exemplares (
    id               SERIAL PRIMARY KEY,
    codigo           VARCHAR(50)  NOT NULL UNIQUE,
    titulo           TEXT         NOT NULL,
    autor            TEXT,
    classificacao    VARCHAR(100),
    tipo_obra        VARCHAR(50),
    situacao_sistema VARCHAR(50)  DEFAULT 'Normal',
    criado_em        TIMESTAMP    DEFAULT NOW()
);

-- Colunas adicionadas depois da criacao original.
-- ADD COLUMN IF NOT EXISTS eh idempotente: roda a cada start sem erro
-- e sem apagar nada que ja exista.
ALTER TABLE exemplares ADD COLUMN IF NOT EXISTS numero_acervo   BIGINT;
ALTER TABLE exemplares ADD COLUMN IF NOT EXISTS numero_exemplar BIGINT;
ALTER TABLE exemplares ADD COLUMN IF NOT EXISTS modo_aquisicao  VARCHAR(50);
ALTER TABLE exemplares ADD COLUMN IF NOT EXISTS data_aquisicao  DATE;

CREATE TABLE IF NOT EXISTS emprestimos (
    id               SERIAL PRIMARY KEY,
    exemplar_id      INTEGER NOT NULL REFERENCES exemplares(id),
    nome_pessoa      TEXT    NOT NULL,
    data_emprestimo  DATE    NOT NULL,
    data_prevista    DATE    NOT NULL,
    criado_em        TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventario (
    id              SERIAL PRIMARY KEY,
    exemplar_id     INTEGER     NOT NULL REFERENCES exemplares(id),
    ano_inventario  INTEGER     NOT NULL DEFAULT EXTRACT(YEAR FROM NOW()),
    resultado       VARCHAR(20) NOT NULL CHECK (resultado IN ('encontrado', 'nao_encontrado')),
    observacao      TEXT,
    registrado_em   TIMESTAMP   DEFAULT NOW(),
    UNIQUE (exemplar_id, ano_inventario)
);

INSERT INTO exemplares (codigo, titulo, autor, classificacao, tipo_obra)
SELECT '1455', 'Neuroanatomia funcional', 'Machado', '611.8 M1491n', 'Livro'
WHERE NOT EXISTS (SELECT 1 FROM exemplares WHERE codigo = '1455');

INSERT INTO exemplares (codigo, titulo, autor, classificacao, tipo_obra)
SELECT '1514', 'Neurociencia basica', 'Guyton', '612.8 G992n', 'Livro'
WHERE NOT EXISTS (SELECT 1 FROM exemplares WHERE codigo = '1514');

INSERT INTO exemplares (codigo, titulo, autor, classificacao, tipo_obra)
SELECT '6299', 'Controle motor', 'Shumway-Cook', '612.7 S5626c', 'Livro'
WHERE NOT EXISTS (SELECT 1 FROM exemplares WHERE codigo = '6299');