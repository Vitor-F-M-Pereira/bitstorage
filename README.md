# BitStorage

# Gerenciador de Despensa - Casa da Criança

## 📌 Sobre o Projeto

O BitStorage é um aplicativo desenvolvido para auxiliar no controle de estoque da ONG **Casa da Criança**, permitindo o cadastro, acompanhamento e organização de alimentos, produtos de higiene e itens de limpeza recebidos por doação ou compra.

O objetivo principal do projeto é facilitar a rotina da instituição, ajudando no controle de entrada e saída de produtos, acompanhamento de validade, organização do estoque e apoio na tomada de decisão sobre quais itens precisam de mais atenção.

Além disso, o sistema também conta com uma proposta de uso de **Machine Learning**, utilizando agrupamento de dados para identificar padrões nas doações e auxiliar a ONG a entender melhor o perfil dos itens recebidos.

---

## 🎯 Objetivo

Desenvolver um aplicativo simples, intuitivo e funcional para melhorar a gestão da despensa da ONG, reduzindo desperdícios e facilitando o controle dos produtos disponíveis.

---

## 🧩 Funcionalidades

- Cadastro de produtos no estoque;
- Registro de entrada de itens por doação ou compra;
- Registro de saída e consumo de produtos;
- Controle de quantidade disponível;
- Acompanhamento de data de validade;
- Identificação de produtos próximos ao vencimento;
- Visualização do estoque atual;
- Controle de usuários por tipo de acesso;
- Área administrativa para gerenciamento do sistema;
- Inserção de dados simulados para testes;
- Análise de padrões de doações utilizando clusterização.

---

## 🧠 Machine Learning

O projeto utiliza uma proposta de **clusterização** para analisar os dados de doações e identificar padrões entre os itens recebidos.

A técnica escolhida foi o **K-Means**, com o objetivo de agrupar doações de acordo com características como:

- Categoria do produto;
- Quantidade recebida;
- Período da doação;
- Frequência de entrada;
- Tipo de item doado.

Com isso, a ONG pode entender melhor quais produtos são mais recebidos em determinados períodos e quais itens precisam ser solicitados com mais frequência.

---

## 🛠️ Tecnologias Utilizadas

- React Native;
- Expo;
- Expo Router;
- Firebase Authentication;
- Firebase Firestore;
- JavaScript / TypeScript;
- GitHub;
- VS Code.
