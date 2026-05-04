import { addDoc, collection } from "firebase/firestore";
import React, { useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { db } from "../../services/firebaseConfig";
import { styles } from "../../styles/estoqueStyles";

const categorias = [
  "Grãos e cereais",
  "Massas",
  "Enlatados e conservas",
  "Leites e derivados",
  "Carnes e proteínas",
  "Hortifruti",
  "Bebidas",
  "Produtos de limpeza",
  "Higiene pessoal",
  "Outros",
];

export default function Cadastro() {
  const [nome, setNome] = useState("");
  const [categoria, setCategoria] = useState("Grãos e cereais");
  const [quantidade, setQuantidade] = useState("");
  const [tipoQuantidade, setTipoQuantidade] = useState("unidades");
  const [validade, setValidade] = useState("");
  const [origem, setOrigem] = useState("Doação");

  const formatarData = (texto) => {
    const numeros = texto.replace(/\D/g, "");
    let dataFormatada = numeros;

    if (numeros.length > 2) {
      dataFormatada = numeros.slice(0, 2) + "/" + numeros.slice(2);
    }

    if (numeros.length > 4) {
      dataFormatada =
        numeros.slice(0, 2) +
        "/" +
        numeros.slice(2, 4) +
        "/" +
        numeros.slice(4, 8);
    }

    setValidade(dataFormatada);
  };

  const converterDataBrasileira = (data) => {
    if (!data) return null;

    const partes = data.split("/");
    if (partes.length !== 3) return null;

    const dia = Number(partes[0]);
    const mes = Number(partes[1]);
    const ano = Number(partes[2]);

    if (
      !dia ||
      !mes ||
      !ano ||
      dia < 1 ||
      dia > 31 ||
      mes < 1 ||
      mes > 12 ||
      ano < 2024
    ) {
      return null;
    }

    return new Date(ano, mes - 1, dia);
  };

  const limparCampos = () => {
    setNome("");
    setCategoria("Grãos e cereais");
    setQuantidade("");
    setTipoQuantidade("unidades");
    setValidade("");
    setOrigem("Doação");
  };

  const validarCampos = () => {
    if (!nome || !categoria || !quantidade || !validade) {
      Alert.alert("Atenção", "Preencha todos os campos.");
      return false;
    }

    if (isNaN(Number(quantidade)) || Number(quantidade) <= 0) {
      Alert.alert("Atenção", "Digite uma quantidade válida.");
      return false;
    }

    if (!converterDataBrasileira(validade)) {
      Alert.alert("Atenção", "Digite a validade no formato DD/MM/AAAA.");
      return false;
    }

    return true;
  };

  const cadastrarAlimento = async () => {
    if (!validarCampos()) return;

    try {
      await addDoc(collection(db, "alimentos"), {
        nome,
        categoria,
        quantidade: Number(quantidade),
        tipoQuantidade,
        validade,
        origem,
        criadoEm: new Date(),
        atualizadoEm: new Date(),
      });

      Alert.alert("Sucesso", "Alimento cadastrado!");
      limparCampos();
    } catch (error) {
      console.log(error);
      Alert.alert("Erro", "Não foi possível cadastrar.");
    }
  };

  const BotaoOpcao = ({ texto, selecionado, aoPressionar }) => (
    <Pressable
      onPress={aoPressionar}
      style={[styles.opcao, selecionado && styles.opcaoSelecionada]}
    >
      <Text
        style={[
          styles.textoOpcao,
          selecionado && styles.textoOpcaoSelecionada,
        ]}
      >
        {texto}
      </Text>
    </Pressable>
  );

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.titulo}>Cadastro</Text>
      <Text style={styles.subtituloPrincipal}>Registrar novo alimento</Text>

      <View style={styles.formulario}>
        <TextInput
          style={styles.input}
          placeholder="Nome do alimento"
          value={nome}
          onChangeText={setNome}
        />

        <Text style={styles.label}>Categoria</Text>
        <View style={styles.opcoes}>
          {categorias.map((item) => (
            <BotaoOpcao
              key={item}
              texto={item}
              selecionado={categoria === item}
              aoPressionar={() => setCategoria(item)}
            />
          ))}
        </View>

        <TextInput
          style={styles.input}
          placeholder="Quantidade"
          value={quantidade}
          onChangeText={setQuantidade}
          keyboardType="numeric"
        />

        <Text style={styles.label}>Tipo de quantidade</Text>
        <View style={styles.opcoes}>
          <BotaoOpcao
            texto="unidades"
            selecionado={tipoQuantidade === "unidades"}
            aoPressionar={() => setTipoQuantidade("unidades")}
          />
          <BotaoOpcao
            texto="kg"
            selecionado={tipoQuantidade === "kg"}
            aoPressionar={() => setTipoQuantidade("kg")}
          />
          <BotaoOpcao
            texto="litros"
            selecionado={tipoQuantidade === "litros"}
            aoPressionar={() => setTipoQuantidade("litros")}
          />
        </View>

        <TextInput
          style={styles.input}
          placeholder="Validade (DD/MM/AAAA)"
          value={validade}
          onChangeText={formatarData}
          keyboardType="numeric"
          maxLength={10}
        />

        <Text style={styles.label}>Origem</Text>
        <View style={styles.opcoes}>
          <BotaoOpcao
            texto="Doação"
            selecionado={origem === "Doação"}
            aoPressionar={() => setOrigem("Doação")}
          />
          <BotaoOpcao
            texto="Compra"
            selecionado={origem === "Compra"}
            aoPressionar={() => setOrigem("Compra")}
          />
        </View>

        <Pressable style={styles.botaoSalvar} onPress={cadastrarAlimento}>
          <Text style={styles.textoBotao}>Cadastrar</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}