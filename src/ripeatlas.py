# src/ripeatlas.py -> Coleta horária de 365 dias (1 ano) do RIPE Atlas para previsão de 48h (2 dias)
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
import requests
import pandas as pd

BASE = "https://atlas.ripe.net/api/v2"
MSM_ID = 1001          # Medição ping pública global (K-root DNS)
DIAS = 365             # 365 dias (1 ano completo) de histórico para treinamento dos modelos de ML
N_PROBES = 15          # 15 probes ativas distribuídas no Brasil
JANELA_DIAS = 15       # Busca em janelas de 15 dias em paralelo para máxima velocidade sem timeout
MAX_WORKERS = 5        # Requisições paralelas simultâneas


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


def _baixar_um_lote(idx, total_lotes, probe_ids_str, inicio, fim):
    for tentativa in range(3):
        try:
            r = requests.get(
                f"{BASE}/measurements/{MSM_ID}/results/",
                params={
                    "start": inicio,
                    "stop": fim,
                    "format": "json",
                    "probe_ids": probe_ids_str,
                },
                timeout=180,
            )
            r.raise_for_status()
            dados = r.json()
            linhas = []
            for x in dados:
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
            print(f"      -> Lote {idx}/{total_lotes} concluído: +{len(dados)} medições brutas.")
            return len(dados), linhas
        except Exception as e:
            if tentativa == 2:
                print(f"      [AVISO] Falha no lote {idx}/{total_lotes}: {e}")
                return 0, []
            time.sleep(2 * (tentativa + 1))
    return 0, []


def baixar_medicoes_em_lotes(probe_ids, start_ts, stop_ts):
    passo = JANELA_DIAS * 86400
    janelas = []
    atual = start_ts
    while atual < stop_ts:
        fim_janela = min(atual + passo, stop_ts)
        janelas.append((atual, fim_janela))
        atual = fim_janela

    total_lotes = len(janelas)
    probe_ids_str = ",".join(map(str, probe_ids))
    print(f"[2/4] Baixando {DIAS} dias em {total_lotes} lotes paralelos ({MAX_WORKERS} workers)...")

    total_brutos = 0
    todas_linhas = []
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as pool:
        futuros = [
            pool.submit(_baixar_um_lote, idx + 1, total_lotes, probe_ids_str, ini, fim)
            for idx, (ini, fim) in enumerate(janelas)
        ]
        for fut in as_completed(futuros):
            qtd, linhas = fut.result()
            total_brutos += qtd
            todas_linhas.extend(linhas)

    return total_brutos, todas_linhas


def main():
    probes = probes_br(N_PROBES)
    meta = {p["id"]: p for p in probes}
    stop = int(time.time())
    start = stop - DIAS * 86400

    total_brutos, linhas = baixar_medicoes_em_lotes(list(meta.keys()), start, stop)
    print(f"[3/4] Total de {total_brutos} medições brutas coletadas (365 dias). Processando séries horárias...")

    if not linhas:
        print("Nenhuma medição encontrada para o período selecionado.")
        return

    df = pd.DataFrame(linhas)
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
    print(f"[4/4] [SUCESSO] {len(g)} registros horários consolidados (de {total_brutos} pings brutos em 365 dias) salvos em {output_file}!")


if __name__ == "__main__":
    main()
