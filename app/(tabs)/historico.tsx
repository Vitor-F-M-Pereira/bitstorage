import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { auth, db } from "../../services/firebaseConfig";
import { colors, styles } from "../../styles/estoqueStyles";

type RegistroHistorico = {
  id: string;
  tipoRegistro: "Compra" | "Doação";
  produto: string;
  categoria?: string;
  categoriaGeral?: string;
  quantidade: number;
  tipoQuantidade?: string;
  valorCompra?: number;
  nomeDoador?: string;
  tipoDoador?: string;
  origem?: string;
  data?: any;
  mes?: string;
  ano?: string;
  dadoSimulado?: boolean;
};

const meses = [
  { nome: "Janeiro", valor: "01" },
  { nome: "Fevereiro", valor: "02" },
  { nome: "Março", valor: "03" },
  { nome: "Abril", valor: "04" },
  { nome: "Maio", valor: "05" },
  { nome: "Junho", valor: "06" },
  { nome: "Julho", valor: "07" },
  { nome: "Agosto", valor: "08" },
  { nome: "Setembro", valor: "09" },
  { nome: "Outubro", valor: "10" },
  { nome: "Novembro", valor: "11" },
  { nome: "Dezembro", valor: "12" },
];

export default function Historico() {
  const dataAtual = new Date();

  const [tipoUsuario, setTipoUsuario] = useState("");
  const [carregandoUsuario, setCarregandoUsuario] = useState(true);
  const [carregandoCompras, setCarregandoCompras] = useState(true);
  const [carregandoDoacoes, setCarregandoDoacoes] = useState(true);

  const [compras, setCompras] = useState<RegistroHistorico[]>([]);
  const [doacoes, setDoacoes] = useState<RegistroHistorico[]>([]);

  const [mesSelecionado, setMesSelecionado] = useState(
    String(dataAtual.getMonth() + 1).padStart(2, "0")
  );

  const [anoSelecionado, setAnoSelecionado] = useState(
    String(dataAtual.getFullYear())
  );

  const [filtroTipo, setFiltroTipo] = useState("todos");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (usuario) => {
      if (!usuario) {
        setTipoUsuario("");
        setCarregandoUsuario(false);
        return;
      }

      try {
        const usuarioRef = doc(db, "usuarios", usuario.uid);
        const usuarioSnap = await getDoc(usuarioRef);

        if (usuarioSnap.exists()) {
          const dados = usuarioSnap.data();
          setTipoUsuario(String(dados.tipoUsuario || "").toLowerCase());
        } else {
          setTipoUsuario("");
        }
      } catch (error) {
        console.log(error);
        setTipoUsuario("");
      } finally {
        setCarregandoUsuario(false);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const consulta = query(
      collection(db, "movimentacoes"),
      orderBy("data", "desc")
    );

    const unsubscribe = onSnapshot(
      consulta,
      (snapshot) => {
        const lista: RegistroHistorico[] = [];

        snapshot.forEach((documento) => {
          const dados = documento.data();

          if (dados.tipo === "entrada" && dados.origem === "Compra") {
            lista.push({
              id: documento.id,
              tipoRegistro: "Compra",
              produto: dados.nomeProduto || "Produto não informado",
              categoria: dados.categoria || "Não informada",
              categoriaGeral: dados.categoriaGeral || "Não informada",
              quantidade: Number(dados.quantidade || 0),
              tipoQuantidade: dados.tipoQuantidade || "unidades",
              valorCompra: Number(dados.precoCompra || 0),
              origem: "Compra",
              data: dados.data,
              mes: dados.mes,
              ano: dados.ano,
              dadoSimulado: false,
            });
          }
        });

        setCompras(lista);
        setCarregandoCompras(false);
      },
      (error) => {
        console.log(error);
        setCarregandoCompras(false);
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const consulta = query(collection(db, "doacoes"), orderBy("data", "desc"));

    const unsubscribe = onSnapshot(
      consulta,
      (snapshot) => {
        const lista: RegistroHistorico[] = [];

        snapshot.forEach((documento) => {
          const dados = documento.data();

          lista.push({
            id: documento.id,
            tipoRegistro: "Doação",
            produto: dados.produto || "Produto não informado",
            categoria: dados.categoria || "Não informada",
            categoriaGeral: dados.categoriaGeral || "Não informada",
            quantidade: Number(dados.quantidade || 0),
            tipoQuantidade: dados.tipoQuantidade || "unidades",
            nomeDoador: dados.nomeDoador || "Doador não informado",
            tipoDoador: dados.tipoDoador || "Não informado",
            origem: "Doação",
            data: dados.data,
            mes: dados.mes,
            ano: dados.ano,
            dadoSimulado: dados.dadoSimulado === true,
          });
        });

        setDoacoes(lista);
        setCarregandoDoacoes(false);
      },
      (error) => {
        console.log(error);
        setCarregandoDoacoes(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const converterData = (data: any) => {
    if (!data) return null;

    if (data?.toDate) {
      return data.toDate();
    }

    if (data instanceof Date) {
      return data;
    }

    const dataConvertida = new Date(data);

    if (isNaN(dataConvertida.getTime())) {
      return null;
    }

    return dataConvertida;
  };

  const obterMesAno = (item: RegistroHistorico) => {
    if (item.mes && item.ano) {
      return {
        mes: String(item.mes).padStart(2, "0"),
        ano: String(item.ano),
      };
    }

    const data = converterData(item.data);

    if (!data) {
      return {
        mes: "",
        ano: "",
      };
    }

    return {
      mes: String(data.getMonth() + 1).padStart(2, "0"),
      ano: String(data.getFullYear()),
    };
  };

  const formatarData = (data: any) => {
    const dataConvertida = converterData(data);

    if (!dataConvertida) {
      return "Data não informada";
    }

    return dataConvertida.toLocaleDateString("pt-BR");
  };

  const formatarMoeda = (valor: any) => {
    const numero = Number(valor || 0);

    return numero.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  const registrosDoMes = useMemo(() => {
    const todos = [...compras, ...doacoes];

    return todos
      .filter((item) => {
        const { mes, ano } = obterMesAno(item);

        const passaMesAno =
          mes === mesSelecionado && ano === String(anoSelecionado);

        if (!passaMesAno) return false;

        if (filtroTipo === "compras") return item.tipoRegistro === "Compra";
        if (filtroTipo === "doacoes") return item.tipoRegistro === "Doação";
        if (filtroTipo === "simulados") return item.dadoSimulado === true;

        return true;
      })
      .sort((a, b) => {
        const dataA = converterData(a.data)?.getTime() || 0;
        const dataB = converterData(b.data)?.getTime() || 0;

        return dataB - dataA;
      });
  }, [compras, doacoes, mesSelecionado, anoSelecionado, filtroTipo]);

  const totalCompras = registrosDoMes.filter(
    (item) => item.tipoRegistro === "Compra"
  ).length;

  const totalDoacoes = registrosDoMes.filter(
    (item) => item.tipoRegistro === "Doação"
  ).length;

  const totalSimulados = registrosDoMes.filter(
    (item) => item.dadoSimulado === true
  ).length;

  const valorTotalCompras = registrosDoMes.reduce((total, item) => {
    if (item.tipoRegistro === "Compra") {
      return total + Number(item.valorCompra || 0);
    }

    return total;
  }, 0);

  const quantidadeTotalDoada = registrosDoMes.reduce((total, item) => {
    if (item.tipoRegistro === "Doação") {
      return total + Number(item.quantidade || 0);
    }

    return total;
  }, 0);

  const categoriasResumo = registrosDoMes.reduce((resultado: any, item) => {
    const categoria = item.categoriaGeral || item.categoria || "Não informada";

    if (!resultado[categoria]) {
      resultado[categoria] = {
        nome: categoria,
        quantidade: 0,
        registros: 0,
      };
    }

    resultado[categoria].quantidade += Number(item.quantidade || 0);
    resultado[categoria].registros += 1;

    return resultado;
  }, {});

  const rankingCategorias = Object.values(categoriasResumo)
    .sort((a: any, b: any) => b.quantidade - a.quantidade)
    .slice(0, 3);

  const carregandoTela =
    carregandoUsuario || carregandoCompras || carregandoDoacoes;

  const BotaoOpcao = ({
    texto,
    selecionado,
    aoPressionar,
  }: {
    texto: string;
    selecionado: boolean;
    aoPressionar: () => void;
  }) => (
    <Pressable
      accessible
      accessibilityRole="button"
      accessibilityLabel={`${texto}${selecionado ? ", selecionado" : ""}`}
      accessibilityHint="Toque duas vezes para selecionar esta opção."
      disabled={carregandoTela}
      onPress={aoPressionar}
      style={({ pressed }) => [
        styles.opcao,
        {
          minHeight: 46,
          justifyContent: "center",
          opacity: carregandoTela || pressed ? 0.65 : 1,
        },
        selecionado && styles.opcaoSelecionada,
      ]}
    >
      <Text
        style={[
          styles.textoOpcao,
          { fontSize: 15 },
          selecionado && styles.textoOpcaoSelecionada,
        ]}
      >
        {texto}
      </Text>
    </Pressable>
  );

  const LinhaResumo = ({
    titulo,
    valor,
    descricao,
    tipo = "neutro",
  }: {
    titulo: string;
    valor: number | string;
    descricao: string;
    tipo?: "neutro" | "sucesso" | "alerta" | "perigo" | "info";
  }) => {
    let corFundo = colors.card;
    let corBorda = colors.borda;
    let corNumero = colors.texto;

    if (tipo === "sucesso") {
      corFundo = colors.sucessoFundo;
      corBorda = colors.sucesso;
      corNumero = colors.sucesso;
    }

    if (tipo === "alerta") {
      corFundo = colors.alertaFundo;
      corBorda = colors.alerta;
      corNumero = colors.alerta;
    }

    if (tipo === "perigo") {
      corFundo = colors.perigoFundo;
      corBorda = colors.perigo;
      corNumero = colors.perigo;
    }

    if (tipo === "info") {
      corFundo = colors.secundarioClaro;
      corBorda = colors.secundario;
      corNumero = colors.secundario;
    }

    return (
      <View
        accessible
        accessibilityRole="text"
        accessibilityLabel={`${titulo}. Valor: ${valor}. ${descricao}`}
        style={{
          backgroundColor: corFundo,
          borderWidth: 1,
          borderColor: corBorda,
          borderRadius: 16,
          paddingVertical: 12,
          paddingHorizontal: 14,
          marginBottom: 10,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          minHeight: 72,
        }}
      >
        <View style={{ flex: 1, paddingRight: 10 }}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: "900",
              color: colors.texto,
              marginBottom: 2,
            }}
          >
            {titulo}
          </Text>

          <Text
            style={{
              fontSize: 13,
              color: colors.textoSuave,
              lineHeight: 18,
            }}
          >
            {descricao}
          </Text>
        </View>

        <Text
          style={{
            fontSize: 26,
            fontWeight: "900",
            color: corNumero,
            minWidth: 70,
            textAlign: "right",
          }}
        >
          {valor}
        </Text>
      </View>
    );
  };

  const Bloco = ({
    titulo,
    descricao,
    children,
  }: {
    titulo: string;
    descricao?: string;
    children: React.ReactNode;
  }) => (
    <View
      style={{
        backgroundColor: colors.card,
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.borda,
        marginBottom: 16,
      }}
    >
      <Text accessibilityRole="header" style={styles.subtitulo}>
        {titulo}
      </Text>

      {descricao && (
        <Text
          style={{
            color: colors.textoSuave,
            lineHeight: 20,
            fontSize: 14,
            marginBottom: 12,
          }}
        >
          {descricao}
        </Text>
      )}

      {children}
    </View>
  );

  const CardRegistro = ({ item }: { item: RegistroHistorico }) => {
    const ehCompra = item.tipoRegistro === "Compra";

    return (
      <View
        accessible
        accessibilityRole="text"
        accessibilityLabel={`${item.tipoRegistro} de ${item.produto}. Quantidade: ${item.quantidade} ${item.tipoQuantidade}. Data: ${formatarData(item.data)}.`}
        style={{
          backgroundColor: item.dadoSimulado
            ? colors.alertaFundo
            : ehCompra
            ? colors.secundarioClaro
            : colors.sucessoFundo,
          borderColor: item.dadoSimulado
            ? colors.alerta
            : ehCompra
            ? colors.secundario
            : colors.sucesso,
          borderWidth: 1,
          borderRadius: 18,
          padding: 15,
          marginBottom: 12,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            gap: 10,
            alignItems: "flex-start",
          }}
        >
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 18,
                fontWeight: "900",
                color: colors.texto,
                marginBottom: 4,
              }}
            >
              {item.produto}
            </Text>

            <Text style={{ color: colors.textoSuave, lineHeight: 21 }}>
              {item.categoriaGeral || "Categoria não informada"} •{" "}
              {item.categoria || "Não informada"}
            </Text>
          </View>

          <View
            style={{
              backgroundColor: colors.card,
              borderWidth: 1,
              borderColor: ehCompra ? colors.secundario : colors.sucesso,
              borderRadius: 999,
              paddingVertical: 6,
              paddingHorizontal: 12,
            }}
          >
            <Text
              style={{
                color: ehCompra ? colors.secundario : colors.sucesso,
                fontWeight: "900",
                fontSize: 13,
              }}
            >
              {item.tipoRegistro}
            </Text>
          </View>
        </View>

        <Text
          style={{
            marginTop: 8,
            color: colors.texto,
            fontWeight: "800",
          }}
        >
          Quantidade: {item.quantidade} {item.tipoQuantidade || "unidades"}
        </Text>

        <Text style={{ color: colors.textoSuave, marginTop: 4 }}>
          Data: {formatarData(item.data)}
        </Text>

        {ehCompra ? (
          <Text style={{ color: colors.textoSuave, marginTop: 4 }}>
            Valor da compra: {formatarMoeda(item.valorCompra)}
          </Text>
        ) : (
          <>
            <Text style={{ color: colors.textoSuave, marginTop: 4 }}>
              Doador: {item.nomeDoador || "Não informado"}
            </Text>

            <Text style={{ color: colors.textoSuave, marginTop: 4 }}>
              Tipo do doador: {item.tipoDoador || "Não informado"}
            </Text>
          </>
        )}

        {item.dadoSimulado && (
          <Text
            style={{
              marginTop: 10,
              color: colors.alerta,
              fontWeight: "900",
              lineHeight: 20,
            }}
          >
            Dado fictício usado para teste da IA.
          </Text>
        )}
      </View>
    );
  };

  if (carregandoTela) {
    return (
      <View
        style={[
          styles.container,
          {
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
          },
        ]}
      >
        <ActivityIndicator
          size="large"
          color={colors.principal}
          accessibilityLabel="Carregando histórico"
        />

        <Text style={{ marginTop: 10, textAlign: "center" }}>
          Carregando histórico...
        </Text>
      </View>
    );
  }

  if (tipoUsuario !== "administrador") {
    return (
      <View style={styles.container}>
        <Text accessibilityRole="header" style={styles.titulo}>
          Acesso restrito
        </Text>

        <Text style={styles.subtituloPrincipal}>
          Somente administradores podem acessar o histórico.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{
        paddingBottom: 32,
      }}
    >
      <Text accessibilityRole="header" style={styles.titulo}>
        Histórico
      </Text>

      <Text style={styles.subtituloPrincipal}>
        Relatório mensal de compras e doações registradas no sistema.
      </Text>

      <Bloco
        titulo="Período do relatório"
        descricao="Escolha o mês e o ano para visualizar somente as compras e doações daquele período."
      >
        <Text style={styles.label}>Ano</Text>

        <TextInput
          accessible
          accessibilityLabel="Ano do relatório"
          accessibilityHint="Digite o ano com quatro números."
          style={styles.input}
          placeholder="Ex: 2026"
          value={anoSelecionado}
          onChangeText={setAnoSelecionado}
          keyboardType="numeric"
          maxLength={4}
        />

        <Text style={styles.label}>Mês</Text>

        <View style={styles.opcoes}>
          {meses.map((item) => (
            <BotaoOpcao
              key={item.valor}
              texto={item.nome}
              selecionado={mesSelecionado === item.valor}
              aoPressionar={() => setMesSelecionado(item.valor)}
            />
          ))}
        </View>
      </Bloco>

      <Bloco
        titulo="Filtrar registros"
        descricao="Escolha se deseja ver todos os registros, somente compras, somente doações ou apenas dados fictícios."
      >
        <View style={styles.opcoes}>
          <BotaoOpcao
            texto="Todos"
            selecionado={filtroTipo === "todos"}
            aoPressionar={() => setFiltroTipo("todos")}
          />

          <BotaoOpcao
            texto="Compras"
            selecionado={filtroTipo === "compras"}
            aoPressionar={() => setFiltroTipo("compras")}
          />

          <BotaoOpcao
            texto="Doações"
            selecionado={filtroTipo === "doacoes"}
            aoPressionar={() => setFiltroTipo("doacoes")}
          />

          <BotaoOpcao
            texto="Fictícios"
            selecionado={filtroTipo === "simulados"}
            aoPressionar={() => setFiltroTipo("simulados")}
          />
        </View>
      </Bloco>

      <Bloco
        titulo="Resumo do mês"
        descricao="Resumo apenas do mês e ano selecionados."
      >
        <LinhaResumo
          titulo="Registros encontrados"
          valor={registrosDoMes.length}
          descricao="Compras e doações do período"
          tipo="info"
        />

        <LinhaResumo
          titulo="Compras"
          valor={totalCompras}
          descricao={`Total gasto: ${formatarMoeda(valorTotalCompras)}`}
          tipo={totalCompras > 0 ? "alerta" : "info"}
        />

        <LinhaResumo
          titulo="Doações"
          valor={totalDoacoes}
          descricao={`Quantidade total doada: ${quantidadeTotalDoada}`}
          tipo={totalDoacoes > 0 ? "sucesso" : "info"}
        />

        <LinhaResumo
          titulo="Dados fictícios"
          valor={totalSimulados}
          descricao="Registros simulados usados para teste da IA"
          tipo={totalSimulados > 0 ? "alerta" : "info"}
        />
      </Bloco>

      {rankingCategorias.length > 0 && (
        <Bloco
          titulo="Categorias mais registradas"
          descricao="Categorias com maior quantidade movimentada no período."
        >
          {rankingCategorias.map((item: any) => (
            <LinhaResumo
              key={item.nome}
              titulo={item.nome}
              valor={item.quantidade}
              descricao={`${item.registros} registro(s) no período`}
              tipo="neutro"
            />
          ))}
        </Bloco>
      )}

      <Text accessibilityRole="header" style={styles.subtitulo}>
        Registros do período
      </Text>

      {registrosDoMes.length === 0 ? (
        <Text style={styles.listaVazia}>
          Nenhuma compra ou doação encontrada para o mês selecionado.
        </Text>
      ) : (
        registrosDoMes.map((item) => <CardRegistro key={item.id} item={item} />)
      )}

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}