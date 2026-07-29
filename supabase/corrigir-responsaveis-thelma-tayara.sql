-- Corrige somente a associação de responsáveis de Thelma e Tayara.
-- Não remove unidades nem altera cadastros, equipamentos ou patrimônios.

begin;

update public.unidades
set responsavel = null,
    updated_at = now()
where responsavel in ('GU - THELMA', 'GU - TAYARA');

with mapa(responsavel, nome) as (
  values
    ('GU - THELMA', 'LP - FUNDAÇÃO BRADESCO PE -'),
    ('GU - THELMA', 'LP - RD JABOATÃO - PE'),
    ('GU - THELMA', 'SOTREQ PERNAMBUCO'),
    ('GU - THELMA', 'LP - HOSPITAL ORTOPÉDICO DA BAHIA - HOBA'),
    ('GU - THELMA', 'LP - CARBONOR'),
    ('GU - THELMA', 'LP - COZINHA BH/ HOSPITAL BH'),
    ('GU - THELMA', 'LP - EQUINOX'),
    ('GU - THELMA', 'LP - HOSP AFRÂNIO PEIXOTO'),
    ('GU - THELMA', 'LP - HOSP CRESCENCIO'),
    ('GU - THELMA', 'LP - HOSP GERAL VITÓRIA DA CONQUISTA'),
    ('GU - THELMA', 'LP - UPA VITÓRIA DA CONQUISTA'),
    ('GU - THELMA', 'LP - HOSP GERAL DE CAMACARI'),
    ('GU - THELMA', 'LP - TEIU VITÓRIA DA CONQUISTA'),
    ('GU - THELMA', 'LP - SONOS COLCHOES'),
    ('GU - THELMA', 'LP - MERCANTE VITÓRIA DA CONQUISTA'),
    ('GU - THELMA', 'LP - MOTECH'),
    ('GU - THELMA', 'LP - MJA LOGISTICA - RD SALVADOR'),
    ('GU - THELMA', 'LP -HGCA'),
    ('GU - THELMA', 'LP - AMBEV CAMACARI'),
    ('GU - TAYARA', 'LP - ALBA'),
    ('GU - TAYARA', 'LP - MERCANTE FEIRA DE SANTANA'),
    ('GU - TAYARA', 'LP - HOSP ESP. LOPES RODRIGUES'),
    ('GU - TAYARA', 'LP- BRESCO -  25/05'),
    ('GU - TAYARA', 'LP -FERRAGENS NEGRAO'),
    ('GU - TAYARA', 'LP - BARTOFIL'),
    ('GU - TAYARA', 'H. PROHOPE - inauguração 01/08/26'),
    ('GU - TAYARA', 'LP - SOTREQ BAHIA'),
    ('GU - TAYARA', 'LP - BRISA'),
    ('GU - TAYARA', 'LP - INTERMARITIMA'),
    ('GU - TAYARA', 'LP - PKG BRASIL'),
    ('GU - TAYARA', 'LP - GOOB ISM'),
    ('GU - TAYARA', 'LP - ERB'),
    ('GU - TAYARA', 'LP - ENSEADA PARAGUAÇU'),
    ('GU - TAYARA', 'LP -REDE BAHIA - 01/06'),
    ('GU - TAYARA', 'LP - TPC - EADI'),
    ('GU - TAYARA', 'HOSPITAL ANA NERY'),
    ('GU - TAYARA', 'LP - HOSP GERAL SANTA TEREZA'),
    ('GU - TAYARA', 'SAPELBA - INAUGURAÇÃO 01/09/26')
), atualizacoes as (
  update public.unidades u
  set responsavel = mapa.responsavel,
      updated_at = now()
  from mapa
  where public.normalize_text(u.nome) = public.normalize_text(mapa.nome)
     or public.normalize_text(regexp_replace(u.nome, '^[0-9]+[[:space:]]*-[[:space:]]*', '')) = public.normalize_text(mapa.nome)
  returning u.id
)
select count(*) as unidades_atualizadas from atualizacoes;

commit;
