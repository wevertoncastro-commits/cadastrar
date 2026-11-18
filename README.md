# Cadastrar

Aplicativo estático para preparar lotes de até 10 obras para importação no Citame. Os PDFs e metadados são processados somente no navegador e não são enviados a um servidor.

## Uso

1. Selecione um PDF e preencha o cadastro.
2. Repita o processo para adicionar outras obras, até o limite de 10.
3. Escolha **Baixar obras em ZIP**.
4. Depois do download, a fila é apagada para iniciar outro lote.

O arquivo ZIP contém a pasta `Obras` com cada PDF e seu respectivo `*.citame.json`.

## Publicação na Vercel

Importe a pasta `Teste/Importar` como raiz do projeto na Vercel. Nenhuma configuração de build ou função de backend é necessária.
