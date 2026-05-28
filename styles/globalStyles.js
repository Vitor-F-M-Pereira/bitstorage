import { StyleSheet } from "react-native";

export const colors = {
  fundo: "#F6FAF7",
  fundoAlternativo: "#EEF6F1",
  card: "#FFFFFF",
  cardSuave: "#FAFDFB",

  principal: "#4F7F65",
  primaria: "#4F7F65",
  principalEscuro: "#28543B",
  principalClaro: "#E6F2EA",
  principalMuitoClaro: "#F1F8F3",

  secundario: "#55798D",
  secundarioEscuro: "#36576B",
  secundarioClaro: "#E8F1F5",

  texto: "#20312A",
  textoMedio: "#425B50",
  textoSuave: "#61776D",
  textoClaro: "#FFFFFF",

  borda: "#D8E7DD",
  bordaForte: "#B9D1C2",

  sucesso: "#3E7A50",
  sucessoFundo: "#E6F4EA",

  alerta: "#9A6B16",
  alertaFundo: "#FFF3D7",

  perigo: "#A94747",
  perigoFundo: "#FCE8E6",

  informacao: "#3E6C8A",
  informacaoFundo: "#E6F0F6",

  cinza: "#EEF2EF",
  cinzaEscuro: "#6E7C75",
  sombra: "#1F3A2D",
};

export const metrics = {
  screenPadding: 20,
  radiusSm: 12,
  radiusMd: 16,
  radiusLg: 22,
  touch: 48,
};

export const shadows = {
  card: {
    shadowColor: colors.sombra,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.09,
    shadowRadius: 14,
    elevation: 3,
  },
  soft: {
    shadowColor: colors.sombra,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
};

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.fundo,
    padding: metrics.screenPadding,
  },

  pageHeader: {
    backgroundColor: colors.principalMuitoClaro,
    borderRadius: metrics.radiusLg,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: colors.borda,
  },

  titulo: {
    fontSize: 30,
    fontWeight: "900",
    color: colors.principalEscuro,
    marginBottom: 6,
    letterSpacing: -0.4,
  },

  subtituloPrincipal: {
    fontSize: 16,
    color: colors.textoSuave,
    marginBottom: 22,
    lineHeight: 23,
  },

  subtitulo: {
    fontSize: 19,
    fontWeight: "900",
    color: colors.texto,
    marginTop: 18,
    marginBottom: 10,
  },

  texto: {
    fontSize: 15,
    color: colors.texto,
    lineHeight: 22,
  },

  textoSuave: {
    fontSize: 15,
    color: colors.textoSuave,
    lineHeight: 22,
  },

  label: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.texto,
    marginTop: 12,
    marginBottom: 8,
  },

  formulario: {
    backgroundColor: colors.card,
    borderRadius: metrics.radiusLg,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.borda,
    ...shadows.card,
  },

  resumo: {
    backgroundColor: colors.principalClaro,
    borderRadius: metrics.radiusLg,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.bordaForte,
  },

  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.borda,
    borderRadius: metrics.radiusMd,
    paddingVertical: 14,
    paddingHorizontal: 14,
    minHeight: 52,
    fontSize: 16,
    color: colors.texto,
    marginBottom: 12,
  },

  inputFocado: {
    borderColor: colors.principal,
    backgroundColor: colors.cardSuave,
  },

  grupoOpcoes: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },

  opcoes: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },

  opcao: {
    backgroundColor: colors.card,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.borda,
    minHeight: metrics.touch,
  },

  opcaoSelecionada: {
    backgroundColor: colors.principal,
    borderColor: colors.principalEscuro,
  },

  textoOpcao: {
    fontSize: 14,
    color: colors.texto,
    fontWeight: "700",
  },

  textoOpcaoSelecionada: {
    color: colors.textoClaro,
    fontWeight: "900",
  },

  botaoSalvar: {
    backgroundColor: colors.principal,
    paddingVertical: 15,
    paddingHorizontal: 16,
    borderRadius: metrics.radiusMd,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
    marginTop: 12,
    ...shadows.soft,
  },

  botaoSecundario: {
    backgroundColor: colors.secundarioClaro,
    paddingVertical: 15,
    paddingHorizontal: 16,
    borderRadius: metrics.radiusMd,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
    borderWidth: 1,
    borderColor: "#CFE0E8",
  },

  textoBotao: {
    color: colors.textoClaro,
    fontSize: 16,
    fontWeight: "900",
  },

  botaoCancelar: {
    backgroundColor: colors.secundarioClaro,
    paddingVertical: 15,
    paddingHorizontal: 16,
    borderRadius: metrics.radiusMd,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#CFE0E8",
  },

  textoCancelar: {
    color: colors.secundarioEscuro,
    fontSize: 16,
    fontWeight: "900",
  },

  card: {
    backgroundColor: colors.card,
    borderRadius: metrics.radiusLg,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.borda,
    ...shadows.card,
  },

  cardCompacto: {
    backgroundColor: colors.card,
    borderRadius: metrics.radiusMd,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.borda,
    ...shadows.soft,
  },

  cardNormal: {
    borderLeftWidth: 6,
    borderLeftColor: colors.sucesso,
  },

  cardProximo: {
    backgroundColor: colors.alertaFundo,
    borderLeftWidth: 6,
    borderLeftColor: colors.alerta,
  },

  cardVencido: {
    backgroundColor: colors.perigoFundo,
    borderLeftWidth: 6,
    borderLeftColor: colors.perigo,
  },

  nome: {
    fontSize: 20,
    fontWeight: "900",
    color: colors.texto,
    marginBottom: 8,
    letterSpacing: -0.2,
  },

  status: {
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    alignSelf: "flex-start",
    fontWeight: "900",
    overflow: "hidden",
  },

  statusNormal: {
    backgroundColor: colors.sucessoFundo,
    color: colors.sucesso,
  },

  statusProximo: {
    backgroundColor: colors.alertaFundo,
    color: colors.alerta,
  },

  statusVencido: {
    backgroundColor: colors.perigoFundo,
    color: colors.perigo,
  },

  areaBotoes: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },

  botaoEditar: {
    flex: 1,
    backgroundColor: colors.secundario,
    padding: 13,
    borderRadius: metrics.radiusMd,
    alignItems: "center",
    justifyContent: "center",
    minHeight: metrics.touch,
  },

  botaoExcluir: {
    flex: 1,
    backgroundColor: colors.perigo,
    padding: 13,
    borderRadius: metrics.radiusMd,
    alignItems: "center",
    justifyContent: "center",
    minHeight: metrics.touch,
  },

  textoBotaoCard: {
    color: colors.textoClaro,
    fontWeight: "900",
    fontSize: 15,
  },

  listaVazia: {
    textAlign: "center",
    color: colors.textoSuave,
    marginTop: 18,
    marginBottom: 18,
    fontSize: 15,
    lineHeight: 22,
  },
});
