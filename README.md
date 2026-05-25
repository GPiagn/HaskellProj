# HaskellProj
# 📚 Sistema de Inventário de Acervo Bibliográfico

API REST em **Haskell** com **Servant** para gerenciamento de inventário de biblioteca, desenvolvida como projeto da disciplina de Programação Funcional.

O sistema digitaliza o processo de inventário manual de um acervo bibliográfico real (~22 mil exemplares), substituindo a planilha Excel com VLOOKUPs cruzados por um sistema web com banco relacional e regras de negócio implementadas em funções puras.

---

## 🎯 Objetivo

A bibliotecária realiza o inventário anual varrendo as prateleiras com o sistema. Cada exemplar tem apenas dois status possíveis:

- ✅ **Encontrado** — exemplar localizado fisicamente
- ❌ **Não encontrado** — exemplar ausente da prateleira, com observação obrigatória explicando o motivo

Quando um exemplar não encontrado tem empréstimo ativo no sistema, a observação é **gerada automaticamente** com nome do leitor, datas do empréstimo e cálculo de atraso em relação à data atual.

---

## 🛠️ Stack

| Camada | Tecnologia |
|--------|-----------|
| Backend | Haskell + Servant |
| Servidor HTTP | Warp |
| Banco de dados | PostgreSQL |
| Frontend | React + Tailwind CSS *(em desenvolvimento)* |
| Deploy | Render *(em desenvolvimento)* |

---

## 📁 Estrutura do projeto

```
HaskellProj/
├── app/
│   ├── Business/
│   │   └── StatusCalc.hs       # Regras de negócio (funções puras)
│   ├── DB/
│   │   └── Queries.hs          # Queries SQL ao PostgreSQL
│   ├── Server/
│   │   └── Handler.hs          # Rotas Servant + handlers
│   ├── Types/
│   │   ├── Exemplar.hs         # Tipos de domínio + JSON + FromRow
│   │   └── Inventario.hs       # Tipos do inventário
│   └── Main.hs                 # Entrypoint do servidor
├── migration.sql               # Script de criação das tabelas
├── HaskellProj.cabal           # Configuração e dependências
└── README.md
```

---

## 🗄️ Modelo de dados

```
exemplares                  emprestimos                 inventario
─────────────              ─────────────              ─────────────
id (PK)                    id (PK)                    id (PK)
codigo (UNIQUE)            exemplar_id (FK)           exemplar_id (FK)
titulo                     nome_pessoa                ano_inventario
autor                      data_emprestimo            resultado
classificacao              data_prevista              observacao
tipo_obra                  criado_em                  registrado_em
situacao_sistema                                      UNIQUE(exemplar_id, ano)
```

A constraint `UNIQUE (exemplar_id, ano_inventario)` na tabela `inventario` garante que cada exemplar tenha apenas um registro de inventário por ano.

---

## 🔌 Endpoints da API

### Exemplares (CRUD completo)

| Método | Rota | Descrição |
|--------|------|-----------|
| GET    | `/exemplares`         | Lista todos os exemplares |
| GET    | `/exemplares/:id`     | Busca um exemplar específico |
| POST   | `/exemplares`         | Cria um novo exemplar |
| PUT    | `/exemplares/:id`     | Atualiza um exemplar existente |
| DELETE | `/exemplares/:id`     | Remove um exemplar |

### Inventário e regras de negócio

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/inventario`         | Registra resultado do inventário (encontrado / não encontrado) |
| GET  | `/nao-encontrados`    | Lista exemplares não encontrados com motivos calculados |
| GET  | `/dashboard/totais`   | Retorna contadores agregados (encontrados, não encontrados, atrasados) |

### Saúde

| Método | Rota | Descrição |
|--------|------|-----------|
| GET    | `/ping`               | Healthcheck da API |

---

## 🧠 Regras de negócio

As regras estão implementadas em `app/Business/StatusCalc.hs` como **funções puras** — determinísticas, sem efeitos colaterais, fáceis de testar.

### Cálculo de atraso de empréstimo

```haskell
calcSituacao :: Day -> Day -> SituacaoEmprestimo
calcSituacao hoje prevista
  | hoje > prevista = Atrasado (fromIntegral $ diffDays hoje prevista)
  | otherwise       = EmDia
```

Recebe a data de hoje e a data prevista de devolução, retorna se está em dia ou quantos dias está atrasado. O cálculo é feito sob demanda — nunca armazenado no banco — então nunca fica desatualizado.

### Validação do inventário

```haskell
validaInventario :: Text -> Maybe Text -> Either Text ()
validaInventario "encontrado"     _        = Right ()
validaInventario "nao_encontrado" (Just _) = Right ()
validaInventario "nao_encontrado" Nothing  = Left "Observação obrigatória"
validaInventario _                _        = Left "Resultado inválido"
```

Garante que `nao_encontrado` sempre venha com observação preenchida e que o resultado seja um dos valores válidos.

### Geração automática de motivo

Quando um exemplar não encontrado tem empréstimo ativo, o backend monta automaticamente o motivo `Emprestado` com nome, datas e situação calculada — sem precisar registrar manualmente.

---

## 🚀 Como rodar localmente

### Pré-requisitos

- GHC 9.6.7 e Cabal 3.0+
- PostgreSQL 14 ou superior
- Windows / Linux / macOS

### Passos

1. **Clonar o repositório**
   ```bash
   git clone https://github.com/GPiagn/HaskellProj.git
   cd HaskellProj
   ```

2. **Criar o banco de dados** (uma única vez)
   ```bash
   psql -U postgres
   ```
   ```sql
   CREATE DATABASE biblioteca_inventario;
   \q
   ```

3. **Configurar a connection string** no `app/Main.hs`
   Ajuste usuário, senha e porta de acordo com sua instalação local.

4. **Compilar e rodar**
   ```bash
   cabal build
   cabal run
   ```

   O servidor sobe em `http://localhost:4000`. As tabelas são criadas automaticamente na primeira execução pelo `runMigration`.

5. **Testar**
   ```bash
   curl http://localhost:4000/ping
   curl http://localhost:4000/exemplares
   ```

---

## 📋 Roteiro de desenvolvimento

- [x] **Fase 1** — Setup base com Servant + endpoint `/ping`
- [x] **Fase 2** — CRUD completo de exemplares com PostgreSQL
- [ ] **Fase 3** — Regras de negócio: inventário, não-encontrados, dashboard
- [ ] **Fase 4** — Frontend em React + Tailwind
- [ ] **Fase 5** — Deploy no Render

---

## 👩‍💻 Autora

**Glória Pianheri** — Estágio em biblioteca + estudante de TI na FATEC.

Projeto da disciplina de Programação Funcional / Haskell.