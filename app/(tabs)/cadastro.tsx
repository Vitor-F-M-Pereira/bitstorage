import { addDoc, collection } from "firebase/firestore";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

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

  const [valorCompra, setValorCompra] = useState("");
  const [origemDoacao, setOrigemDoacao] = useState("");
  const [observacao, setObservacao] = useState("");

  const [carregando, setCarregando] = useState(false);

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

    const dataConvertida = new Date(ano, mes - 1, dia);

    if (
      dataConvertida.getDate() !== dia ||
      dataConvertida.getMonth() !== mes - 1 ||
      dataConvertida.getFullYear() !== ano
    ) {
      return null;
    }

    return dataConvertida;
  };

  const converterValorMonetario = (valor) => {
    if (!valor) return 0;

    const valorLimpo = valor
      .replace("R$", "")
      .replace(/\s/g, "")
      .replace(/\./g, "")
      .replace(",", ".");

    const valorNumerico = Number(valorLimpo);

    if (isNaN(valorNumerico)) {
      return 0;
    }

    return valorNumerico;
  };

  const limparCampos = () => {
    setNome("");
    setCategoria("Grãos e cereais");
    setQuantidade("");
    setTipoQuantidade("unidades");
    setValidade("");
    setOrigem("Doação");
    setValorCompra("");
    setOrigemDoacao("");
    setObservacao("");
  };

  const validarCampos = () => {
    if (!nome.trim() || !categoria || !quantidade.trim() || !validade.trim()) {
      Alert.alert("Atenção", "Preencha os campos obrigatórios.");
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

    if (origem === "Compra") {
      const valorConvertido = converterValorMonetario(valorCompra);

      if (!valorCompra.trim() || valorConvertido <= 0) {
        Alert.alert("Atenção", "Digite um valor válido para a compra.");
        return false;
      }
    }

    return true;
  };

  const cadastrarAlimento = async () => {
    if (carregando) return;

    if (!validarCampos()) return;

    try {
      setCarregando(true);

      const dataValidade = converterDataBrasileira(validade);
      const quantidadeConvertida = Number(quantidade);
      const precoCompra = origem === "Compra" ? converterValorMonetario(valorCompra) : 0;

      const detalheOrigem =
        origem === "Compra"
          ? "Compra realizada pela instituição"
          : origemDoacao.trim()
          ? origemDoacao.trim()
          : "Doação sem origem informada";

      const observacaoFinal = observacao.trim()
        ? observacao.trim()
        : origem === "Compra"
        ? "Entrada por compra"
        : "Entrada por doação";

      const novoAlimento = await addDoc(collection(db, "alimentos"), {
        nome: nome.trim(),
        categoria,
        quantidade: quantidadeConvertida,
        tipoQuantidade,
        validade,
        validadeData: dataValidade,
        origem,
        detalheOrigem,
        origemDoacao: origem === "Doação" ? detalheOrigem : "",
        precoCompra,
        observacao: observacaoFinal,
        criadoEm: new Date(),
      });

      await addDoc(collection(db, "movimentacoes"), {
        produtoId: novoAlimento.id,
        nomeProduto: nome.trim(),
        tipo: "entrada",
        quantidade: quantidadeConvertida,
        quantidadeAnterior: 0,
        quantidadeAtual: quantidadeConvertida,
        categoria,
        origem,
        detalheOrigem,
        origemDoacao: origem === "Doação" ? detalheOrigem : "",
        tipoQuantidade,
        precoCompra,
        observacao: observacaoFinal,
        data: new Date(),
        mes: String(new Date().getMonth() + 1).padStart(2, "0"),
        ano: String(new Date().getFullYear()),
      });

      Alert.alert("Sucesso", "Alimento cadastrado!");
      limparCampos();
    } catch (error) {
      console.log(error);
      Alert.alert("Erro", "Não foi possível cadastrar o alimento.");
    } finally {
      setCarregando(false);
    }
  };

  const BotaoOpcao = ({ texto, selecionado, aoPressionar }) => (
    <Pressable
      disabled={carregando}
      onPress={aoPressionar}
      style={[
        styles.opcao,
        selecionado && styles.opcaoSelecionada,
        carregando && { opacity: 0.6 },
      ]}
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

      <Text style={styles.subtituloPrincipal}>
        Registrar novo alimento no estoque
      </Text>

      <View style={styles.formulario}>
        <Text style={styles.label}>Nome do alimento</Text>

        <TextInput
          style={styles.input}
          placeholder="Ex: Arroz, feijão, leite..."
          value={nome}
          editable={!carregando}
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

        <Text style={styles.label}>Quantidade</Text>

        <TextInput
          style={styles.input}
          placeholder="Ex: 10"
          value={quantidade}
          editable={!carregando}
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

        <Text style={styles.label}>Validade</Text>

        <TextInput
          style={styles.input}
          placeholder="DD/MM/AAAA"
          value={validade}
          editable={!carregando}
          onChangeText={formatarData}
          keyboardType="numeric"
          maxLength={10}
        />

        <Text style={styles.label}>Origem</Text>

        <View style={styles.opcoes}>
          <BotaoOpcao
            texto="Doação"
            selecionado={origem === "Doação"}
            aoPressionar={() => {
              setOrigem("Doação");
              setValorCompra("");
            }}
          />

          <BotaoOpcao
            texto="Compra"
            selecionado={origem === "Compra"}
            aoPressionar={() => {
              setOrigem("Compra");
              setOrigemDoacao("");
            }}
          />
        </View>

        {origem === "Compra" && (
          <>
            <Text style={styles.label}>Valor da compra</Text>

            <TextInput
              style={styles.input}
              placeholder="Ex: 25,90"
              value={valorCompra}
              editable={!carregando}
              onChangeText={setValorCompra}
              keyboardType="numeric"
            />
          </>
        )}

        {origem === "Doação" && (
          <>
            <Text style={styles.label}>Origem da doação</Text>

            <TextInput
              style={styles.input}
              placeholder="Ex: Mercado parceiro, campanha, pessoa física..."
              value={origemDoacao}
              editable={!carregando}
              onChangeText={setOrigemDoacao}
            />
          </>
        )}

        <Text style={styles.label}>Observação</Text>

        <TextInput
          style={[styles.input, { minHeight: 90, textAlignVertical: "top" }]}
          placeholder="Observação opcional sobre o alimento"
          value={observacao}
          editable={!carregando}
          onChangeText={setObservacao}
          multiline
        />

        <Pressable
          disabled={carregando}
          style={[styles.botaoSalvar, carregando && { opacity: 0.6 }]}
          onPress={cadastrarAlimento}
        >
          {carregando ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.textoBotao}>Cadastrar</Text>
          )}
        </Pressable>

        {carregando && (
          <Text style={{ textAlign: "center", marginTop: 10 }}>
            Salvando alimento...
          </Text>
        )}
      </View>
    </ScrollView>
  );
}