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