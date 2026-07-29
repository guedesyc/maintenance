-- Execute este arquivo uma vez no SQL Editor do projeto Supabase correto.
alter table public.unidades
  add column if not exists responsavel text;

with mapa(responsavel, nome) as (
  values
    ('GU - THELMA', 'LP - FUNDAÇÃO BRADESCO PE -'),
    ('GU - THELMA', 'LP - ALBA'),
    ('GU - THELMA', 'LP - RD JABOATÃO - PE'),
    ('GU - THELMA', 'LP - MERCANTE FEIRA DE SANTANA'),
    ('GU - THELMA', 'SOTREQ PERNAMBUCO'),
    ('GU - THELMA', 'LP - HOSP ESP. LOPES RODRIGUES'),
    ('GU - THELMA', 'LP - HOSPITAL ORTOPÉDICO DA BAHIA - HOBA'),
    ('GU - THELMA', 'LP- BRESCO -  25/05'),
    ('GU - THELMA', 'LP - CARBONOR'),
    ('GU - THELMA', 'LP -FERRAGENS NEGRAO'),
    ('GU - THELMA', 'LP - COZINHA BH/ HOSPITAL BH'),
    ('GU - THELMA', 'LP - BARTOFIL'),
    ('GU - THELMA', 'LP - EQUINOX'),
    ('GU - THELMA', 'H. PROHOPE - inauguração 01/08/26'),
    ('GU - THELMA', 'LP - HOSP AFRÂNIO  PEIXOTO'),
    ('GU - THELMA', 'LP - SOTREQ BAHIA'),
    ('GU - THELMA', 'LP - HOSP CRESCENCIO'),
    ('GU - THELMA', 'LP - BRISA'),
    ('GU - THELMA', 'LP - HOSP GERAL VITÓRIA DA CONQUISTA'),
    ('GU - THELMA', 'LP - INTERMARITIMA'),
    ('GU - THELMA', 'LP - UPA VITÓRIA DA CONQUISTA'),
    ('GU - THELMA', 'LP - PKG BRASIL'),
    ('GU - THELMA', 'LP - HOSP GERAL DE CAMACARI'),
    ('GU - THELMA', 'LP - GOOB ISM'),
    ('GU - THELMA', 'LP - TEIU VITÓRIA DA CONQUISTA'),
    ('GU - THELMA', 'LP - ERB'),
    ('GU - THELMA', 'LP - SONOS COLCHOES'),
    ('GU - THELMA', 'LP - ENSEADA PARAGUAÇU'),
    ('GU - THELMA', 'LP - MERCANTE VITÓRIA DA CONQUISTA'),
    ('GU - THELMA', 'LP -REDE BAHIA - 01/06'),
    ('GU - THELMA', 'LP - MOTECH'),
    ('GU - THELMA', 'LP - TPC - EADI'),
    ('GU - THELMA', 'LP - MJA LOGISTICA - RD SALVADOR'),
    ('GU - THELMA', 'HOSPITAL ANA NERY'),
    ('GU - THELMA', 'LP -HGCA'),
    ('GU - THELMA', 'LP - HOSP GERAL SANTA  TEREZA'),
    ('GU - THELMA', 'LP - AMBEV CAMACARI'),
    ('GU - THELMA', 'SAPELBA - INAUGURAÇÃO 01/09/26'),
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
    ('GU - TAYARA', 'LP - HOSP GERAL SANTA  TEREZA'),
    ('GU - TAYARA', 'SAPELBA - INAUGURAÇÃO 01/09/26'),
    ('GU - ROBERTO', 'LP - HOSP R ITANHAEM - HRI'),
    ('GU - ROBERTO', 'LP - HOSP CARAGUATATUBA - HRLN'),
    ('GU - ROBERTO', 'LP - HOSP R REGISTRO - HRR'),
    ('GU - ROBERTO', 'LP - HOSP HSI'),
    ('GU - ROBERTO', 'LP -DIA OSASCO'),
    ('GU - ROBERTO', 'LP - AMBEV SP'),
    ('GU - ROBERTO', 'LP - CONAUT'),
    ('GU - ROBERTO', 'LP - RD EMBU DAS ARTES'),
    ('GU - ROBERTO', 'HOSPITAL CRUZEIRO'),
    ('GU - ROBERTO', 'LP - CORTEVA'),
    ('GU - ROBERTO', 'LP - TPC - UBERLÂNCIA'),
    ('GU - ROBERTO', 'LP-ENGIE -JUARUNA/COARI'),
    ('GU - ROBERTO', 'LP - RD CUIABA'),
    ('GU - ROBERTO', 'LP - RD PARÁ'),
    ('GU - ROBERTO', 'LP- TPC - MAUÁ - BRIDGESTONE'),
    ('GU - ROBERTO', 'LP - COZINHA CENTRAL GOIÂNIA : 02'),
    ('GU - ROBERTO', 'LP - RD APARECIDA'),
    ('GU - ROBERTO', 'LP - RD HIDROLÃNDIA'),
    ('GU - ROBERTO', 'RD - BRASÍLIA - INAUGURAÇÃO 07/26'),
    ('GU - FABIANA', 'AROMA - PRES. ILHEUS'),
    ('GU - FABIANA', 'LP - RP PAULO AFONSO'),
    ('GU - FABIANA', 'LP - UE PIRAJÁ'),
    ('GU - FABIANA', 'LP - COZ COM. PAULO  AFONSO'),
    ('GU - FABIANA', 'LP - HOSP MATERNIDADE  IJS - ILHÉUS'),
    ('GU - FABIANA', 'AROMA - PRESIDIO JEQUIÉ'),
    ('GU - FABIANA', 'AROMA - PVC'),
    ('GU - FABIANA', 'AROMA  - PLB'),
    ('GU - FABIANA', 'LP - CAD. PUBLICA'),
    ('GU - FABIANA', 'LP - PRESIDIO FEMININO'),
    ('GU - FABIANA', 'AROMA - HCT'),
    ('GU - FABIANA', 'LP - PRES FEIRA SANTANA'),
    ('GU - FABIANA', 'LP - REST POPULAR LAURO DE FREITAS'),
    ('GU - FABIANA', 'LP - HOSP GERAL MENANDRO DE  FARIAS')
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

update public.unidades
set responsavel = 'GU - EMILIA',
    updated_at = now()
where public.normalize_text(nome) ~ '(^| )(ESCOLA|CMEI|EM)( |$)'
   or public.normalize_text(nome) like '%CENTRO MUNICIPAL DE EDUCACAO INFANTIL%'
   or public.normalize_text(nome) like '%CENTRO EDUCACIONAL%';
