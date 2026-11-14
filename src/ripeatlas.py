# src/ripeatlas.py -> Coleta horária enriquecida do RIPE Atlas para previsão de 48h (2 dias)
import time
import requests
import pandas as pd

BASE = "https://atlas.ripe.net/api/v2"
MSM_ID = 1001          # Medição ping pública global (K-root DNS)
DIAS = 21              # 21 dias (3 semanas completas) de histórico para capturar padrões semanais e horários
N_PROBES = 15          # 15 probes ativas distribuídas no Brasil
JANELA_DIAS = 7        # Busca em janelas de 7 dias para evitar timeout na API do RIPE Atlas


def probes_br(n):
    print(f"[1/4] Buscando {n} probes ativas no Brasil na API do RIPE Atlas...")
    r = requests.get(
        f"{BASE}/probes/",
        params={"country_code": "BR", "status": 1, "page_size": n},
        timeout=30,
    )
    r.raise_for_status()
    probes = r.json().get("results", [])
    print(f"      -> Encontradas {len(probes)} probes: {[p['id'] for p in probes]}")
    return probes


def baixar_medicoes_em_lotes(probe_ids, start_ts, stop_ts):
    todos_dados = []
    passo = JANELA_DIAS * 86400
    atual = start_ts
    lote = 1
    total_lotes = ((stop_ts - start_ts) + passo - 1) // passo

    while atual < stop_ts:
        fim_janela = min(atual + passo, stop_ts)
        print(f"[2/4] Baixando lote {lote}/{total_lotes} de medições brutas...")
        r = requests.get(
            f"{BASE}/measurements/{MSM_ID}/results/",
            params={
                "start": atual,
                "stop": fim_janela,
                "format": "json",
                "probe_ids": ",".join(map(str, probe_ids)),
            },
            timeout=120,
        )
        r.raise_for_status()
        dados_lote = r.json()
        print(f"      -> Lote {lote}: +{len(dados_lote)} medições recebidas.")
        todos_dados.extend(dados_lote)
        atual = fim_janela
        lote += 1

    return todos_dados


def main():
    probes = probes_br(N_PROBES)
    meta = {p["id"]: p for p in probes}
    stop = int(time.time())
    start = stop - DIAS * 86400

    raw_data = baixar_medicoes_em_lotes(list(meta.keys()), start, stop)
    print(f"[3/4] Total de {len(raw_data)} medições brutas coletadas. Processando séries horárias...")

    linhas = []
    for x in raw_data:
        sent = x.get("sent", 0)
        if sent <= 0:
            continue
        avg_val = x.get("avg")
        min_val = x.get("min")
        max_val = x.get("max")
        linhas.append({
            "probe_id": x["prb_id"],
            "ts_raw": x["timestamp"],
            "avg": avg_val if (avg_val is not None and avg_val > 0) else None,
            "min": min_val if (min_val is not None and min_val > 0) else None,
            "max": max_val if (max_val is not None and max_val > 0) else None,
            "sent": sent,
            "rcvd": x.get("rcvd", 0),
        })

    if not linhas:
        print("Nenhuma medição encontrada para o período selecionado.")
        return

    df = pd.DataFrame(linhas)
    # Conversão vetorizada de timestamp e agrupamento por HORA ("h") em vez de dia ("D")
    df["ts"] = pd.to_datetime(df["ts_raw"], unit="s", utc=True)
    df["hora_slot"] = df["ts"].dt.floor("h")

    g = (
        df.groupby(["probe_id", "hora_slot"])
        .agg(
            avg_rtt_ms=("avg", "mean"),
            min_rtt_ms=("min", "min"),
            max_rtt_ms=("max", "max"),
            std_rtt_ms=("avg", "std"),
            sent=("sent", "sum"),
            rcvd=("rcvd", "sum"),
            amostras=("avg", "count"),
        )
        .reset_index()
    )

    # Remove horas onde não houve nenhuma resposta de RTT válida
    g = g.dropna(subset=["avg_rtt_ms"]).copy()
    g["std_rtt_ms"] = g["std_rtt_ms"].fillna(0.0)
    g["packet_loss_pct"] = ((1.0 - g["rcvd"] / g["sent"]).clip(lower=0.0, upper=1.0)) * 100.0
    g["hour"] = g["hora_slot"].dt.hour
    g["day_of_week"] = g["hora_slot"].dt.dayofweek
    g["measurement_id"] = MSM_ID
    g["country_code"] = "BR"
    g["asn_v4"] = g["probe_id"].map(lambda i: meta.get(i, {}).get("asn_v4"))
    g["asn_v6"] = g["probe_id"].map(lambda i: meta.get(i, {}).get("asn_v6"))
    g["longitude"] = g["probe_id"].map(
        lambda i: (meta.get(i, {}).get("geometry") or {}).get("coordinates", [None, None])[0]
    )
    g["latitude"] = g["probe_id"].map(
        lambda i: (meta.get(i, {}).get("geometry") or {}).get("coordinates", [None, None])[1]
    )

    g = g.rename(columns={"hora_slot": "timestamp"}).drop(columns=["sent", "rcvd"])
    g = g.sort_values(["probe_id", "timestamp"]).reset_index(drop=True)

    output_file = "measurements_history.csv"
    g.to_csv(output_file, index=False, float_format="%.3f")
    print(f"[4/4] [SUCESSO] {len(g)} registros horários consolidados (de {len(raw_data)} pings brutos) salvos em {output_file}!")


if __name__ == "__main__":
    main()
