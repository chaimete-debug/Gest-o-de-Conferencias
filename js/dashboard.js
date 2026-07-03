window.Views = window.Views || {};

Views.dashboard = async function () {
  const conferenceId = App.state.conferenceId;
  if (!conferenceId) {
    App.container.innerHTML = `<div class="card panel"><h3>Nenhuma conferência seleccionada</h3><p class="muted">Crie ou seleccione uma conferência para visualizar o painel operacional.</p>${Auth.can('conferencias.gerir')?'<button class="btn btn-primary" id="dashboard-create-conference">Abrir Conferência</button>':''}</div>`;
    const button = document.getElementById('dashboard-create-conference');
    if (button) button.onclick = () => App.render('conference');
    return;
  }

  const data = await Api.request('dashboard.get', { id_conferencia: conferenceId });
  const k = data.kpis || {};
  const conference = data.conference || App.state.currentConference || {};
  const quickActions = dashboardQuickActions_();
  const agenda = (data.todaySessions && data.todaySessions.length ? data.todaySessions : data.upcomingSessions) || [];
  const agendaTitle = data.todaySessions && data.todaySessions.length ? 'Agenda de hoje' : 'Próximas sessões';

  App.container.innerHTML = `
    <div class="page-header dashboard-page-header">
      <div>
        <span class="eyebrow">Painel operacional</span>
        <h1>Visão Geral</h1>
        <p class="muted">Inscrições, finanças, credenciação, programa e logística da conferência.</p>
      </div>
      ${quickActions.length ? `<div class="page-actions dashboard-quick-actions">${quickActions.map(dashboardQuickActionButton_).join('')}</div>` : ''}
    </div>

    ${dashboardConferenceSummary_(conference)}

    <section class="dashboard-section">
      <div class="dashboard-section-heading"><div><span class="eyebrow">Indicadores principais</span><h2>Inscrições e finanças</h2></div></div>
      <div class="kpi-grid dashboard-core-kpis">
        ${dashboardKpi_('Participantes', k.participantes, 'Total registado')}
        ${dashboardKpi_('Inscrições confirmadas', k.confirmadas, 'Confirmadas ou presentes')}
        ${dashboardKpi_('Presentes', k.presentes, 'Check-in realizado')}
        ${dashboardKpi_('Sessões', k.sessoes, 'Programa da conferência')}
        ${dashboardKpi_('Total devido', UI.money(k.totalDevido), `${k.pagamentosConfirmados || 0} pagamentos confirmados`)}
        ${dashboardKpi_('Total arrecadado', UI.money(k.totalArrecadado), `${k.progressoFinanceiro || 0}% do total devido`, 'success')}
        ${dashboardKpi_('Saldo pendente', UI.money(k.totalPendente), `${k.semPagamento || 0} sem pagamento`, Number(k.totalPendente) > 0 ? 'warning' : 'success')}
        ${dashboardKpi_('Inscrições pendentes', k.pendentes, `${k.pagamentosParciais || 0} pagamentos parciais`, Number(k.pendentes) > 0 ? 'warning' : '')}
      </div>
    </section>

    <div class="dashboard-two-column">
      <section class="card panel dashboard-finance-card">
        <div class="panel-header"><div><span class="eyebrow">Execução financeira</span><h3>Progresso da arrecadação</h3></div><strong class="dashboard-progress-value">${Math.max(0, Number(k.progressoFinanceiro || 0))}%</strong></div>
        ${dashboardProgress_(k.totalArrecadado, k.totalDevido, k.progressoFinanceiro)}
        <div class="dashboard-finance-summary">
          <div><span>Arrecadado</span><strong>${UI.money(k.totalArrecadado)}</strong></div>
          <div><span>Pendente</span><strong>${UI.money(k.totalPendente)}</strong></div>
          <div><span>Pagamentos confirmados</span><strong>${UI.escape(k.pagamentosConfirmados || 0)}</strong></div>
        </div>
      </section>

      <section class="card panel dashboard-alert-card">
        <div class="panel-header"><div><span class="eyebrow">Controlo</span><h3>Atenção necessária</h3></div><span class="status ${(data.alerts || []).length ? 'warn' : 'ok'}">${(data.alerts || []).length ? (data.alerts || []).length + ' ALERTAS' : 'SEM ALERTAS'}</span></div>
        <div class="dashboard-alert-list">${dashboardAlerts_(data.alerts || [])}</div>
      </section>
    </div>

    <section class="dashboard-section">
      <div class="dashboard-section-heading"><div><span class="eyebrow">Fase 2</span><h2>Operações da conferência</h2></div></div>
      <div class="dashboard-operation-grid">
        ${dashboardOperation_('Credenciais entregues', k.credenciaisEntregues, 'credentials', '▣')}
        ${dashboardOperation_('Check-ins realizados', k.checkins, 'credentials', '✓')}
        ${dashboardOperation_('Participantes alojadas', k.alojadas, 'accommodations', '⌂')}
        ${dashboardOperation_('Vagas de alojamento', k.vagasAlojamento, 'accommodations', '＋')}
        ${dashboardOperation_('Transporte atribuído', k.transporteAtribuido, 'transport', '↗')}
        ${dashboardOperation_('Refeições servidas hoje', k.refeicoesHoje, 'meals', '◉')}
        ${dashboardOperation_('Materiais entregues', k.materiaisEntregues, 'materials', '□')}
        ${dashboardOperation_('Certificados emitidos', k.certificadosEmitidos, 'certificates', '★')}
      </div>
    </section>

    <div class="dashboard-two-column dashboard-lower-grid">
      <section class="card panel">
        <div class="panel-header"><div><span class="eyebrow">Programa</span><h3>${agendaTitle}</h3></div>${Auth.can('sessoes.ver')?'<button class="btn btn-ghost btn-sm dashboard-go" data-view="sessions">Ver programa</button>':''}</div>
        <div class="list-stack">${dashboardAgenda_(agenda)}</div>
      </section>

      <section class="card panel">
        <div class="panel-header"><div><span class="eyebrow">Representação</span><h3>Participantes por distrito</h3></div></div>
        <div class="list-stack">${dashboardDistrictBars_(data.byDistrict || [])}</div>
      </section>
    </div>

    <section class="card panel dashboard-activity-card">
      <div class="panel-header"><div><span class="eyebrow">Auditoria operacional</span><h3>Actividade recente</h3></div></div>
      <div class="dashboard-activity-list">${dashboardActivity_(data.recentActivity || [])}</div>
    </section>`;

  document.querySelectorAll('.dashboard-go').forEach(button => {
    button.onclick = () => App.render(button.dataset.view);
  });
}

function dashboardQuickActions_() {
  const actions = [];
  if (Auth.can('participantes.gerir')) actions.push({ label: 'Nova inscrição', view: 'participants', primary: true });
  if (Auth.can('pagamentos.registar')) actions.push({ label: 'Registar pagamento', view: 'payments' });
  if (Auth.can('credenciais.gerir')) actions.push({ label: 'Fazer check-in', view: 'credentials' });
  if (Auth.can('credenciais.ver')) actions.push({ label: 'Emitir credencial', view: 'credentials' });
  return actions.slice(0, 4);
}

function dashboardQuickActionButton_(action) {
  return `<button class="btn ${action.primary ? 'btn-primary' : 'btn-secondary'} dashboard-go" data-view="${UI.escape(action.view)}">${UI.escape(action.label)}</button>`;
}

function dashboardConferenceSummary_(conference) {
  const capacity = Number(conference.capacidade || 0);
  const participants = Number(conference.participantes || 0);
  const occupancy = Math.max(0, Number(conference.ocupacao_percentual || 0));
  const timing = dashboardTiming_(conference);
  return `<section class="card dashboard-conference-summary">
    <div class="dashboard-conference-main">
      <div><span class="eyebrow">Conferência seleccionada</span><h2>${UI.escape(conference.nome || 'Conferência')}</h2><p>${UI.escape(conference.tema || conference.lema || 'Tema por indicar')}</p></div>
      <div class="dashboard-conference-status">${UI.status(conference.estado)}<span>${UI.escape(timing)}</span></div>
    </div>
    <div class="dashboard-conference-meta">
      <div><span>Local</span><strong>${UI.escape(conference.local || 'Por definir')}</strong></div>
      <div><span>Realização</span><strong>${UI.date(conference.data_inicio)} — ${UI.date(conference.data_fim)}</strong></div>
      <div><span>Ocupação</span><strong>${participants}${capacity ? ' de ' + capacity : ''} participantes</strong></div>
    </div>
    ${capacity ? `<div class="dashboard-capacity"><div><span>Capacidade utilizada</span><strong>${occupancy}%</strong></div><div class="dashboard-progress"><i style="width:${Math.min(100, occupancy)}%"></i></div></div>` : ''}
  </section>`;
}

function dashboardTiming_(conference) {
  const toStart = conference.dias_para_inicio;
  const toEnd = conference.dias_para_fim;
  if (toStart !== null && toStart !== undefined && Number(toStart) > 0) return Number(toStart) === 1 ? 'Começa amanhã' : `Começa em ${toStart} dias`;
  if (toEnd !== null && toEnd !== undefined && Number(toEnd) >= 0) return Number(toEnd) === 0 ? 'Termina hoje' : Number(toEnd) === 1 ? 'Termina amanhã' : `${toEnd} dias até ao encerramento`;
  if (toEnd !== null && toEnd !== undefined && Number(toEnd) < 0) return 'Conferência encerrada';
  return 'Datas por confirmar';
}

function dashboardKpi_(label, value, detail, tone) {
  return `<div class="card kpi dashboard-kpi ${tone ? 'dashboard-kpi-' + tone : ''}"><span>${UI.escape(label)}</span><strong>${UI.escape(value ?? 0)}</strong><small>${UI.escape(detail || '')}</small></div>`;
}

function dashboardProgress_(collected, due, percentage) {
  const percent = Math.max(0, Number(percentage || 0));
  return `<div class="dashboard-progress dashboard-finance-progress"><i style="width:${Math.min(100, percent)}%"></i></div><p class="muted dashboard-progress-caption">${UI.money(collected)} arrecadados de ${UI.money(due)} devidos.</p>`;
}

function dashboardAlerts_(alerts) {
  if (!alerts.length) return `<div class="dashboard-all-clear"><strong>✓</strong><div><b>Nenhuma pendência crítica</b><span>Os principais controlos encontram-se regularizados.</span></div></div>`;
  return alerts.map(alert => `<button class="dashboard-alert dashboard-go ${UI.escape(alert.severidade || 'warning')}" data-view="${UI.escape(alert.vista || 'dashboard')}"><span class="dashboard-alert-count">${UI.escape(alert.total)}</span><span>${UI.escape(String(alert.texto || '').replace(/^\d+\s*/, ''))}</span><b>›</b></button>`).join('');
}

function dashboardOperation_(label, value, view, icon) {
  const canOpen = dashboardCanView_(view);
  return `<button class="card dashboard-operation ${canOpen ? 'dashboard-go' : ''}" ${canOpen ? `data-view="${UI.escape(view)}"` : 'disabled'}><span class="dashboard-operation-icon">${UI.escape(icon)}</span><span><small>${UI.escape(label)}</small><strong>${UI.escape(value ?? 0)}</strong></span><b>›</b></button>`;
}

function dashboardCanView_(view) {
  const permissions = {
    credentials: 'credenciais.ver',
    accommodations: 'alojamento.ver',
    transport: 'transporte.ver',
    meals: 'alimentacao.ver',
    materials: 'materiais.ver',
    certificates: 'certificados.ver'
  };
  return Auth.can(permissions[view] || 'dashboard.ver');
}

function dashboardAgenda_(rows) {
  if (!rows.length) return UI.empty('Ainda não existem sessões programadas.');
  return rows.map(session => `<div class="list-item dashboard-session-item"><div class="dashboard-session-time"><strong>${UI.escape(session.hora_inicio || '—')}</strong><span>${UI.date(session.data)}</span></div><div><strong>${UI.escape(session.titulo)}</strong><small>${UI.escape(session.local || 'Local por definir')} · ${UI.escape(session.hora_inicio || '')}${session.hora_fim ? '–' + UI.escape(session.hora_fim) : ''}</small></div>${UI.status(session.estado)}</div>`).join('');
}

function dashboardDistrictBars_(rows) {
  if (!rows.length) return UI.empty('Sem dados por distrito.');
  const max = Math.max(...rows.map(row => Number(row.total || 0)), 1);
  return rows.map(row => `<div class="bar-row"><span>${UI.escape(row.nome)}</span><div class="bar"><i style="width:${Math.round(Number(row.total || 0) / max * 100)}%"></i></div><strong>${UI.escape(row.total)}</strong></div>`).join('');
}

function dashboardActivity_(rows) {
  if (!rows.length) return UI.empty('Ainda não existe actividade registada para esta conferência.');
  return rows.map(row => `<div class="dashboard-activity-item"><span class="dashboard-activity-dot"></span><div><strong>${UI.escape(row.descricao || 'Actividade registada')}</strong><small>${UI.escape(row.utilizador || 'Sistema')} · ${dashboardDateTime_(row.data_hora)}</small></div></div>`).join('');
}

function dashboardDateTime_(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (isNaN(date)) return UI.escape(value);
  return new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(date);
}
