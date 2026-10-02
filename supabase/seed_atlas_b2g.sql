-- =====================================================================
-- ATLAS B2G — Seed inicial (reference data + responsáveis padrão)
-- Idempotente (ON CONFLICT). Rode após schema_atlas_b2g.sql.
-- =====================================================================

-- ---- Parâmetros / listas de referência (em parametros_sistema) ----
INSERT INTO parametros_sistema (chave, valor_json, descricao) VALUES
 ('ufs', '["DF","GO"]', 'UFs do piloto'),
 ('categorias_ti', '["Cibersegurança","Infraestrutura","Redes","Cloud","Software","Backup/DR","Serviços/Outsourcing","CFTV/Videomonitoramento","Telecom","Dados/BI/IA","Hardware","Governança de TI","TI (geral)"]', 'Categorias de TI do classificador'),
 ('prioridades', '["Ataque máximo","Prioridade crítica","Alta prioridade","Média prioridade","Monitoramento","Baixa / revisão"]', 'Faixas de prioridade (score)'),
 ('urgencias', '["Crítica","Alta","Média","Baixa","Revisão"]', 'Níveis de urgência comercial'),
 ('janelas_comerciais', '["Ataque imediato","Abordagem prioritária","Preparação comercial","Nutrição estratégica","Monitoramento","Validação manual"]', 'Janelas comerciais'),
 ('status_comercial', '["Novo","Em abordagem","Em negociação","Proposta enviada","Ganho","Perdido","Sem oportunidade"]', 'Status comercial editável pela equipe'),
 ('status_validacao', '["Pendente","Validada","Descartada","Em análise"]', 'Status de validação humana'),
 ('tipos_rodada', '["semanal","producao","teste","avulsa"]', 'Tipos de rodada'),
 ('score_pesos', '{"vencimento":30,"valor":20,"categoria":15,"concorrente":10,"confianca":8,"qualidade":7,"orgao":5,"uf":3,"fonte":2}', 'Pesos do score comercial')
ON CONFLICT (chave) DO UPDATE SET valor_json = EXCLUDED.valor_json, descricao = EXCLUDED.descricao, updated_at = CURRENT_TIMESTAMP;

-- ---- Responsáveis padrão (substitua pelos nomes reais do time) ----
INSERT INTO responsaveis (nome, uf, categoria, tipo_responsavel, ativo) VALUES
 ('Comercial DF',            'DF', 'default',  'Comercial',   TRUE),
 ('Especialista Cyber DF',   'DF', 'cyber',    'Especialista',TRUE),
 ('Especialista Software DF','DF', 'software', 'Especialista',TRUE),
 ('Gerente Serviços DF',     'DF', 'servicos', 'Gerente',     TRUE),
 ('Especialista Infra DF',   'DF', 'infra',    'Especialista',TRUE),
 ('Comercial GO',            'GO', 'default',  'Comercial',   TRUE),
 ('Especialista Cyber GO',   'GO', 'cyber',    'Especialista',TRUE),
 ('Especialista Software GO','GO', 'software', 'Especialista',TRUE),
 ('Gerente Serviços GO',     'GO', 'servicos', 'Gerente',     TRUE),
 ('Especialista Infra GO',   'GO', 'infra',    'Especialista',TRUE)
ON CONFLICT (nome) DO NOTHING;
