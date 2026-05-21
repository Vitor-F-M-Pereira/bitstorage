import json
from collections import defaultdict
from datetime import datetime

import azure.functions as func
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler

app = func.FunctionApp(http_auth_level=func.AuthLevel.ANONYMOUS)


def numero(valor):
    try:
        return float(str(valor).replace(",", "."))
    except Exception:
        return 0.0


def texto(valor, padrao=""):
    valor = str(valor or "").strip()
    return valor if valor else padrao


def gerar_recomendacao(categorias, frequencia, quantidade_total):
    categoria_principal = categorias[0] if categorias else "itens diversos"

    if frequencia >= 4 and quantidade_total >= 30:
        return f"Doador com bom histórico para campanhas de {categoria_principal}."

    if frequencia >= 2:
        return f"Doador compatível com pedidos de {categoria_principal}, com recorrência moderada."

    return f"Doador eventual. Pode ser considerado em campanhas específicas de {categoria_principal}."


@app.route(route="analisar-doacoes", methods=["POST"])
def analisar_doacoes(req: func.HttpRequest) -> func.HttpResponse:
    try:
        dados = req.get_json()

        if not isinstance(dados, list) or len(dados) == 0:
            return func.HttpResponse(
                json.dumps({"erro": "Envie uma lista de doações para análise."}, ensure_ascii=False),
                status_code=400,
                mimetype="application/json",
            )

        linhas = []
        for item in dados:
            categoria = texto(item.get("categoria"), "Categoria não informada")
            linhas.append({
                "nome": texto(item.get("nome"), "Item não informado"),
                "categoria": categoria,
                "categoriaGeral": texto(item.get("categoriaGeral"), "Outros"),
                "quantidade": numero(item.get("quantidade")),
                "unidade": texto(item.get("unidade"), "unidades"),
                "origem": texto(item.get("origem"), "doacao"),
                "doadorId": texto(item.get("doadorId")),
                "nomeDoador": texto(item.get("nomeDoador"), "Doador não informado"),
                "cidade": texto(item.get("cidade"), "Cidade não informada"),
                "contato": texto(item.get("contato"), "Contato não informado"),
                "mes": texto(item.get("mes")),
                "ano": texto(item.get("ano")),
                "dataEntrada": texto(item.get("dataEntrada")),
            })

        df = pd.DataFrame(linhas)
        df = df[df["quantidade"] > 0].copy()

        if df.empty:
            return func.HttpResponse(
                json.dumps({"erro": "Não há quantidades válidas para análise."}, ensure_ascii=False),
                status_code=400,
                mimetype="application/json",
            )

        df["chaveDoador"] = df.apply(
            lambda row: row["doadorId"] or f"{row['nomeDoador']}|{row['contato']}",
            axis=1,
        )

        categorias_dummies = pd.get_dummies(df["categoria"], prefix="cat")
        base = pd.concat([df[["chaveDoador", "quantidade"]], categorias_dummies], axis=1)

        agregacoes = {"quantidade": ["sum", "mean", "count"]}
        for coluna in categorias_dummies.columns:
            agregacoes[coluna] = "sum"

        resumo = base.groupby("chaveDoador").agg(agregacoes)
        resumo.columns = ["_".join(col).strip("_") for col in resumo.columns.values]
        resumo = resumo.reset_index()
        resumo = resumo.rename(columns={
            "quantidade_sum": "quantidade_total",
            "quantidade_mean": "quantidade_media",
            "quantidade_count": "frequencia",
        })

        if len(resumo) == 1:
            resumo["cluster"] = 0
        else:
            quantidade_clusters = min(3, len(resumo))
            colunas_features = [col for col in resumo.columns if col != "chaveDoador"]
            features = resumo[colunas_features]
            features_normalizadas = StandardScaler().fit_transform(features)
            modelo = KMeans(n_clusters=quantidade_clusters, random_state=42, n_init=10)
            resumo["cluster"] = modelo.fit_predict(features_normalizadas)

        detalhes_doador = {}
        for chave, grupo in df.groupby("chaveDoador"):
            categorias = grupo["categoria"].value_counts().index.tolist()
            produtos = grupo["nome"].value_counts().index.tolist()
            meses = []
            for _, row in grupo.iterrows():
                mes_ano = f"{row['mes']}/{row['ano']}" if row["mes"] and row["ano"] else "período não informado"
                if mes_ano not in meses:
                    meses.append(mes_ano)

            ultima = "Data não informada"
            datas_validas = []
            for valor in grupo["dataEntrada"].tolist():
                try:
                    datas_validas.append(datetime.fromisoformat(valor.replace("Z", "+00:00")))
                except Exception:
                    pass
            if datas_validas:
                ultima = max(datas_validas).strftime("%d/%m/%Y")

            primeira = grupo.iloc[0]
            detalhes_doador[chave] = {
                "nome": primeira["nomeDoador"],
                "cidade": primeira["cidade"],
                "contato": primeira["contato"],
                "categorias": categorias,
                "produtos": produtos,
                "meses": meses,
                "ultima_doacao": ultima,
            }

        clusters = []
        for cluster_id in sorted(resumo["cluster"].unique()):
            grupo_cluster = resumo[resumo["cluster"] == cluster_id]
            doadores = []
            categorias_cluster = []

            for _, row in grupo_cluster.iterrows():
                chave = row["chaveDoador"]
                detalhes = detalhes_doador.get(chave, {})
                categorias = detalhes.get("categorias", [])
                categorias_cluster.extend(categorias)
                doadores.append({
                    "nome": detalhes.get("nome", "Doador não informado"),
                    "cidade": detalhes.get("cidade", "Cidade não informada"),
                    "contato": detalhes.get("contato", "Contato não informado"),
                    "categorias": categorias,
                    "produtos": detalhes.get("produtos", []),
                    "meses": detalhes.get("meses", []),
                    "ultima_doacao": detalhes.get("ultima_doacao", "Data não informada"),
                    "frequencia": int(row["frequencia"]),
                    "quantidade_total": round(float(row["quantidade_total"]), 2),
                })

            categorias_ordenadas = pd.Series(categorias_cluster).value_counts().index.tolist() if categorias_cluster else []
            frequencia_total = int(grupo_cluster["frequencia"].sum())
            quantidade_total = float(grupo_cluster["quantidade_total"].sum())
            quantidade_media = float(grupo_cluster["quantidade_media"].mean())

            if frequencia_total >= 4:
                perfil = "Doadores recorrentes por categoria"
            elif quantidade_total >= 30:
                perfil = "Doadores com maior volume de contribuição"
            else:
                perfil = "Doadores ocasionais ou específicos"

            clusters.append({
                "grupo": int(cluster_id) + 1,
                "perfil": perfil,
                "categorias": categorias_ordenadas,
                "quantidade_total": round(quantidade_total, 2),
                "quantidade_media": round(quantidade_media, 2),
                "frequencia": frequencia_total,
                "doadores": doadores,
                "recomendacao": gerar_recomendacao(categorias_ordenadas, frequencia_total, quantidade_total),
            })

        resposta = {
            "total_registros": int(len(df)),
            "total_doadores": int(df["chaveDoador"].nunique()),
            "total_grupos": int(len(clusters)),
            "clusters": clusters,
        }

        return func.HttpResponse(
            json.dumps(resposta, ensure_ascii=False),
            status_code=200,
            mimetype="application/json",
        )

    except Exception as erro:
        return func.HttpResponse(
            json.dumps({"erro": "Erro ao processar análise.", "detalhes": str(erro)}, ensure_ascii=False),
            status_code=500,
            mimetype="application/json",
        )
