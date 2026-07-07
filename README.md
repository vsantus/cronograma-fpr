# Cronograma FPR

Aplicativo Expo para organizar a escala de quem tira o lixo.

## Funcionalidades

- Tela **Hoje** com o responsavel do dia.
- Acoes do dia:
  - **Tirou o lixo**: marca o dia como concluido e avanca para o proximo responsavel.
  - **Faltou**: pula a responsabilidade para o proximo integrante.
  - **Esqueceu**: mantem o mesmo responsavel pelos proximos 2 dias uteis.
- Tela **Integrantes** para cadastrar, editar e remover nomes.
- Listagem de integrantes em accordion.
- Validacao de nome vazio e duplicado.
- Persistencia local com AsyncStorage.

## Regras

- A fila de responsaveis segue ordem alfabetica.
- Apenas dias uteis entram na escala.
- Sabado e domingo ficam sem escala.
- Ao abrir o app, os dados salvos sao carregados automaticamente.

## Estrutura

```txt
app/
  _layout.tsx
  index.tsx
  integrantes.tsx

src/
  components/
  contexts/
  screens/
  services/
  types/
  utils/
```

## Como rodar

Instale as dependencias:

```bash
npm install
```

Inicie o app:

```bash
npm run start
```

Rodar no navegador:

```bash
npm run web
```

## Verificacoes

```bash
npm run lint
npx tsc --noEmit
```

## Stack

- Expo SDK 54
- React Native
- Expo Router
- AsyncStorage
- TypeScript
