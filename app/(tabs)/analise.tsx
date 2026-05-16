import { collection, onSnapshot } from "firebase/firestore";
import React, { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    ScrollView,
    Text,
    View,
} from "react-native";

import { db } from "../../services/firebaseConfig";
import { colors, styles } from "../../styles/estoqueStyles";

type Doacao = {
  id: string;
  doadorId?: string;
  nomeDoador?: string;
  tipoDoador?: string;
  categoriaGeral?: string;
  categoria?: string;
  produto?: string;
  quantidade?: number;
  data?: any;
};

type PerfilDoador = {
  doadorId: string;
  nomeDoador: string;
  tipoDoador: string;
  totalAlimentos: number;
  totalLimpeza: number;
  totalHigiene: number;
  totalOutros: number;
  quantidadeTotal: number;
  numeroDoacoes: number;
  variedadeCategorias: number;
  produtos: string[];
  categorias: string[];
  vetor: number[];
  cluster?: number;
};

export default function AnaliseIA() {
  const [doacoes, setDoacoes] = useState<Doacao[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "doacoes"),
      (snapshot) => {
        const lista: Doacao[] = [];

        snapshot.forEach((documento) => {
          lista.push({
            id: documento.id,
            ...documento.data(),
          } as Doacao);
        });

        setDoacoes(lista);
        setCarregando(false);
      },
      (error) => {
        console.log(error);
        setCarregando(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const montarPerfisDoadores = () => {
    const perfis: Record<string, PerfilDoador> = {};

    doacoes.forEach((doacao) => {
      const doadorId = doacao.doadorId || "sem-doador";
      const categoriaGeral = String(doacao.categoriaGeral || "Outros");
      const quantidade = Number(doacao.quantidade || 0);
      const produto = doacao.produto || "Produto não informado";
      const categoria = doacao.categoria || "Categoria não informada";

      if (!perfis[doadorId]) {
        perfis[doadorId] = {
          doadorId,
          nomeDoador: doacao.nomeDoador || "Doador não informado",
          tipoDoador: doacao.tipoDoador || "Não informado",
          totalAlimentos: 0,
          totalLimpeza: 0,
          totalHigiene: 0,
          totalOutros: 0,
          quantidadeTotal: 0,
          numeroDoacoes: 0,
          variedadeCategorias: 0,
          produtos: [],
          categorias: [],
          vetor: [],
        };
      }

      perfis[doadorId].quantidadeTotal += quantidade;
      perfis[doadorId].numeroDoacoes += 1;

      if (!perfis[doadorId].produtos.includes(produto)) {
        perfis[doadorId].produtos.push(produto);
      }

      if (!perfis[doadorId].categorias.includes(categoria)) {
        perfis[doadorId].categorias.push(categoria);
      }

      if (categoriaGeral === "Alimentos") {
        perfis[doadorId].totalAlimentos += quantidade;
      } else if (categoriaGeral === "Limpeza") {
        perfis[doadorId].totalLimpeza += quantidade;
      } else if (categoriaGeral === "Higiene") {
        perfis[doadorId].totalHigiene += quantidade;
      } else {
        perfis[doadorId].totalOutros += quantidade;
      }
    });

    return Object.values(perfis).map((perfil) => ({
      ...perfil,
      variedadeCategorias: perfil.categorias.length,
      vetor: [
        perfil.totalAlimentos,
        perfil.totalLimpeza,
        perfil.totalHigiene,
        perfil.totalOutros,
        perfil.quantidadeTotal,
        perfil.numeroDoacoes,
        perfil.categorias.length,
      ],
    }));
  };

  const normalizarVetores = (dados: PerfilDoador[]) => {
    if (dados.length === 0) return [];

    const tamanhoVetor = dados[0].vetor.length;
    const maximos = Array(tamanhoVetor).fill(0);

    dados.forEach((item) => {
      item.vetor.forEach((valor, index) => {
        if (valor > maximos[index]) {
          maximos[index] = valor;
        }
      });
    });

    return dados.map((item) => ({
      ...item,
      vetor: item.vetor.map((valor, index) => {
        if (maximos[index] === 0) return 0;
        return valor / maximos[index];
      }),
    }));
  };

  const calcularDistancia = (vetorA: number[], vetorB: number[]) => {
    const soma = vetorA.reduce((total, valor, index) => {
      const diferenca = valor - vetorB[index];
      return total + diferenca * diferenca;
    }, 0);

    return Math.sqrt(soma);
  };

  const calcularMedia = (itens: PerfilDoador[]) => {
    if (itens.length === 0) return [];

    const tamanhoVetor = itens[0].vetor.length;
    const soma = Array(tamanhoVetor).fill(0);

    itens.forEach((item) => {
      item.vetor.forEach((valor, index) => {
        soma[index] += valor;
      });
    });

    return soma.map((valor) => valor / itens.length);
  };

  const aplicarKMeans = (dadosOriginais: PerfilDoador[]) => {
    if (dadosOriginais.length === 0) return [];

    if (dadosOriginais.length === 1) {
      return dadosOriginais.map((item) => ({
        ...item,
        cluster: 0,
      }));
    }

    const dados = normalizarVetores(dadosOriginais);
    const quantidadeClusters = Math.min(2, dados.length);

    let centroides = dados
      .slice(0, quantidadeClusters)
      .map((item) => item.vetor);

    let dadosComCluster = dados.map((item) => ({
      ...item,
      cluster: 0,
    }));

    for (let repeticao = 0; repeticao < 10; repeticao++) {
      dadosComCluster = dados.map((item) => {
        let clusterMaisProximo = 0;
        let menorDistancia = calcularDistancia(item.vetor, centroides[0]);

        centroides.forEach((centroide, index) => {
          const distancia = calcularDistancia(item.vetor, centroide);

          if (distancia < menorDistancia) {
            menorDistancia = distancia;
            clusterMaisProximo = index;
          }
        });

        return {
          ...item,
          cluster: clusterMaisProximo,
        };
      });

      centroides = centroides.map((centroide, index) => {
        const itensDoCluster = dadosComCluster.filter(
          (item) => item.cluster === index
        );

        if (itensDoCluster.length === 0) {
          return centroide;
        }

        return calcularMedia(itensDoCluster);
      });
    }

    return dadosOriginais.map((itemOriginal) => {
      const itemNormalizado = dadosComCluster.find(
        (item) => item.doadorId === itemOriginal.doadorId
      );

      return {
        ...itemOriginal,
        cluster: itemNormalizado?.cluster ?? 0,
      };
    });
  };

  const perfisDoadores = useMemo(() => montarPerfisDoadores(), [doacoes]);

  const resultadoKMeans = useMemo(
    () => aplicarKMeans(perfisDoadores),
    [perfisDoadores]
  );

  const grupos = useMemo(() => {
    const agrupamento: Record<number, PerfilDoador[]> = {};

    resultadoKMeans.forEach((perfil) => {
      const cluster = perfil.cluster ?? 0;

      if (!agrupamento[cluster]) {
        agrupamento[cluster] = [];
      }

      agrupamento[cluster].push(perfil);
    });

    return Object.entries(agrupamento).map(([cluster, itens]) => ({
      cluster: Number(cluster),
      itens,
    }));
  }, [resultadoKMeans]);

  const totalDoadores = perfisDoadores.length;
  const totalDoacoes = doacoes.length;

  const totalAlimentos = perfisDoadores.reduce(
    (total, item) => total + item.totalAlimentos,
    0
  );

  const totalLimpeza = perfisDoadores.reduce(
    (total, item) => total + item.totalLimpeza,
    0
  );

  const totalHigiene = perfisDoadores.reduce(
    (total, item) => total + item.totalHigiene,
    0
  );

  const identificarPerfilGrupo = (itens: PerfilDoador[]) => {
    const alimentos = itens.reduce((total, item) => total + item.totalAlimentos, 0);
    const limpeza = itens.reduce((total, item) => total + item.totalLimpeza, 0);
    const higiene = itens.reduce((total, item) => total + item.totalHigiene, 0);

    if (alimentos >= limpeza && alimentos >= higiene) {
      return {
        titulo: "Perfil de doadores de alimentos essenciais",
        descricao:
          "Este grupo concentra doações de alimentos, como arroz, carne e óleo. Pode ser acionado em campanhas de reposição alimentar.",
        cor: colors.sucesso,
        fundo: colors.sucessoFundo,
      };
    }

    if (limpeza >= alimentos && limpeza >= higiene) {
      return {
        titulo: "Perfil de doadores de produtos de limpeza",
        descricao:
          "Este grupo concentra doações de produtos como detergente, sabão e itens de limpeza. Pode ser acionado quando a ONG precisar reforçar materiais de higiene do ambiente.",
        cor: colors.secundario,
        fundo: colors.secundarioClaro,
      };
    }

    return {
      titulo: "Perfil de doadores de higiene",
      descricao:
        "Este grupo concentra doações de higiene pessoal. Pode ser útil para campanhas específicas de cuidado e saúde.",
      cor: colors.alerta,
      fundo: colors.alertaFundo,
    };
  };

  const CardResumo = ({
    titulo,
    valor,
    descricao,
  }: {
    titulo: string;
    valor: string | number;
    descricao: string;
  }) => (
    <View style={styles.card}>
      <Text style={styles.nome}>{titulo}</Text>

      <Text
        style={{
          fontSize: 28,
          fontWeight: "bold",
          color: colors.principalEscuro,
          marginTop: 4,
        }}
      >
        {valor}
      </Text>

      <Text
        style={{
          color: colors.textoSuave,
          marginTop: 6,
          lineHeight: 20,
        }}
      >
        {descricao}
      </Text>
    </View>
  );

  if (carregando) {
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
        <ActivityIndicator size="large" color={colors.principal} />

        <Text style={{ marginTop: 10 }}>Carregando análise...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.titulo}>Análise IA</Text>

      <Text style={styles.subtituloPrincipal}>
        Agrupamento de perfis de doadores usando K-Means com base nas doações
        registradas.
      </Text>

      {perfisDoadores.length < 2 ? (
        <Text style={styles.listaVazia}>
          Ainda não há doadores suficientes para gerar a clusterização. Insira
          dados simulados ou cadastre novas doações.
        </Text>
      ) : (
        <>
          <Text style={styles.subtitulo}>Resumo da base analisada</Text>

          <CardResumo
            titulo="Doadores analisados"
            valor={totalDoadores}
            descricao="Quantidade de doadores com doações registradas na base."
          />

          <CardResumo
            titulo="Doações registradas"
            valor={totalDoacoes}
            descricao="Quantidade total de doações usadas na análise."
          />

          <CardResumo
            titulo="Total em alimentos"
            valor={totalAlimentos}
            descricao="Soma das quantidades doadas na categoria geral de alimentos."
          />

          <CardResumo
            titulo="Total em limpeza"
            valor={totalLimpeza}
            descricao="Soma das quantidades doadas na categoria geral de produtos de limpeza."
          />

          <CardResumo
            titulo="Total em higiene"
            valor={totalHigiene}
            descricao="Soma das quantidades doadas na categoria geral de higiene pessoal."
          />

          <Text style={styles.subtitulo}>Grupos encontrados pelo K-Means</Text>

          {grupos.map((grupo) => {
            const perfilGrupo = identificarPerfilGrupo(grupo.itens);

            return (
              <View
                key={grupo.cluster}
                style={[
                  styles.card,
                  {
                    backgroundColor: perfilGrupo.fundo,
                    borderColor: perfilGrupo.cor,
                  },
                ]}
              >
                <Text style={styles.nome}>{perfilGrupo.titulo}</Text>

                <Text
                  style={{
                    color: colors.textoSuave,
                    lineHeight: 22,
                    marginBottom: 12,
                  }}
                >
                  {perfilGrupo.descricao}
                </Text>

                {grupo.itens.map((perfil) => (
                  <View
                    key={perfil.doadorId}
                    style={{
                      backgroundColor: colors.card,
                      borderRadius: 14,
                      padding: 12,
                      marginTop: 10,
                      borderWidth: 1,
                      borderColor: colors.borda,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "bold",
                        color: colors.texto,
                        marginBottom: 6,
                      }}
                    >
                      {perfil.nomeDoador}
                    </Text>

                    <Text>Tipo: {perfil.tipoDoador}</Text>
                    <Text>Total de doações: {perfil.numeroDoacoes}</Text>
                    <Text>Quantidade total: {perfil.quantidadeTotal}</Text>
                    <Text>Alimentos: {perfil.totalAlimentos}</Text>
                    <Text>Limpeza: {perfil.totalLimpeza}</Text>
                    <Text>Higiene: {perfil.totalHigiene}</Text>
                    <Text>
                      Produtos: {perfil.produtos.join(", ")}
                    </Text>
                  </View>
                ))}
              </View>
            );
          })}

          <Text style={styles.subtitulo}>Interpretação</Text>

          <View style={styles.card}>
            <Text style={styles.nome}>Como essa análise ajuda?</Text>

            <Text style={{ color: colors.textoSuave, lineHeight: 22 }}>
              A clusterização permite identificar padrões de comportamento dos
              doadores. Assim, a ONG pode direcionar melhor seus pedidos: para
              doadores com perfil alimentar, solicitar itens essenciais; para
              doadores de limpeza, solicitar sabão, detergente e produtos
              similares.
            </Text>
          </View>
        </>
      )}

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}