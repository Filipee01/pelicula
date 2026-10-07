"""
Prepara a base de dados da aplicação a partir do dataset do Kaggle
"Movies Daily Update Dataset" (dados do TMDB):
https://www.kaggle.com/datasets/akshaypawar7/millions-of-movies

Baixa o zip (165 MB, sem precisar de login) para dados_brutos/, lê o CSV de
722 mil filmes e gera public/dados/filmes.json só com os filmes lançados que
têm pôster, data, gênero e pelo menos MINIMO_VOTOS votos. As imagens não são
baixadas: a aplicação as carrega de image.tmdb.org pelo caminho de cada filme.

Uso (só a biblioteca padrão do Python):
    python scripts/preparar_dados.py
"""

import csv
import io
import json
import re
import urllib.request
import zipfile
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
ZIP = RAIZ / "dados_brutos" / "millions-of-movies.zip"
SAIDA = RAIZ / "public" / "dados" / "filmes.json"
URL = "https://www.kaggle.com/api/v1/datasets/download/akshaypawar7/millions-of-movies"

MINIMO_VOTOS = 10
TAMANHO_SINOPSE = 240
# A base não marca filmes adultos; estas palavras-chave os tiram da galeria.
PALAVRAS_ADULTAS = {
    "erotic",
    "erotic movie",
    "erotic vignettes",
    "eroticism",
    "erotique",
    "gay pornography",
    "hentai",
    "pink film",
    "porno",
    "pornographic video",
    "pornography",
    "sexploitation",
    "softcore",
}


def baixar() -> None:
    if ZIP.exists():
        print(f"Usando {ZIP.name} já baixado")
        return
    ZIP.parent.mkdir(exist_ok=True)
    parcial = ZIP.with_suffix(".parcial")
    with urllib.request.urlopen(URL) as resposta, open(parcial, "wb") as saida:
        total = int(resposta.headers.get("Content-Length", 0))
        feito = 0
        while bloco := resposta.read(1 << 20):
            saida.write(bloco)
            feito += len(bloco)
            if total:
                print(f"\rBaixando do Kaggle: {feito / total:6.1%}", end="", flush=True)
    print()
    parcial.rename(ZIP)


def resumir(texto: str) -> str:
    texto = " ".join(texto.split())
    if len(texto) <= TAMANHO_SINOPSE:
        return texto
    return texto[:TAMANHO_SINOPSE].rsplit(" ", 1)[0] + "…"


def main() -> None:
    baixar()
    csv.field_size_limit(10**9)

    generos: list[str] = []
    indice_genero: dict[str, int] = {}
    filmes: list[list] = []
    vistos: set[str] = set()

    with zipfile.ZipFile(ZIP) as pacote, pacote.open("movies.csv") as arquivo:
        leitor = csv.DictReader(io.TextIOWrapper(arquivo, encoding="utf-8", errors="replace"))
        for linha in leitor:
            data = re.match(r"(\d{4})-", linha["release_date"] or "")
            if (
                not data
                or not linha["poster_path"]
                or not linha["genres"]
                or linha["status"] != "Released"
                or float(linha["vote_count"] or 0) < MINIMO_VOTOS
                or linha["id"] in vistos
                or PALAVRAS_ADULTAS.intersection(linha["keywords"].split("-"))
            ):
                continue
            vistos.add(linha["id"])

            ids_generos = []
            for nome in linha["genres"].split("-"):
                if nome not in indice_genero:
                    indice_genero[nome] = len(generos)
                    generos.append(nome)
                ids_generos.append(indice_genero[nome])

            filmes.append(
                [
                    linha["title"].strip(),
                    int(data.group(1)),
                    ids_generos,
                    linha["poster_path"],
                    linha["backdrop_path"],
                    round(float(linha["vote_average"] or 0), 1),
                    int(float(linha["vote_count"])),
                    int(float(linha["runtime"] or 0)),
                    resumir(linha["overview"]),
                ]
            )
            if len(filmes) % 10000 == 0:
                print(f"\r{len(filmes)} filmes", end="", flush=True)
    print()

    # Cada filme: [título, ano, gêneros, pôster, fundo, nota, votos, duração (min),
    # sinopse]; o id é a posição no vetor. O elenco fica de fora: a base separa os
    # nomes com hífen, o que quebra nomes compostos como "Carrie-Anne Moss".
    dados = {"generos": generos, "filmes": filmes}
    SAIDA.parent.mkdir(parents=True, exist_ok=True)
    SAIDA.write_text(json.dumps(dados, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"Pronto: {len(filmes)} filmes, {len(generos)} gêneros -> {SAIDA}")


if __name__ == "__main__":
    main()
