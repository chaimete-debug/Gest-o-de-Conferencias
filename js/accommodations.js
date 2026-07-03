window.lookupSingleLogisticsParticipant = async function (query) {
  const value = String(query || '').trim();
  if (!value) throw new Error('Indique o código QR, número de inscrição, nome ou telefone.');
  const result = await Api.request('registrations.lookup', {
    id_conferencia: App.state.conferenceId,
    query: value
  });
  if (!result.items?.length) throw new Error('Participante não encontrada.');
  if (result.items.length > 1) throw new Error('Foram encontradas várias participantes. Use o número de inscrição ou o QR.');
  return result.items[0];
};

Views.accommodations = async function () {
  const [placesResult, assignmentsResult] = await Promise.all([
    Api.request('accommodations.list', { id_conferencia: App.state.conferenceId, pageSize: 500 }),
    Api.request('accommodations.assignments', { id_conferencia: App.state.conferenceId, pageSize: 500 })
  ]);
  App.state.accommodations = placesResult.items || [];
  App.state.accommodationAssignments = assignmentsResult.items || [];
  const summary = placesResult.summary || {};
  const canManage = Auth.can('alojamento.gerir');
  const conference = App.state.currentConference || {};

  App.container.innerHTML = `<div class="page-header">
    <div><span class="eyebrow">Logística de hospedagem</span><h1>Alojamento</h1><p class="muted">Controle locais, capacidade, quartos, camas e atribuições das participantes.</p></div>
    <div class="page-actions">${canManage ? '<button id="new-accommodation" class="btn btn-primary">Novo local</button>' : ''}</div>
  </div>
  <div class="kpi-grid logistics-kpis">
    <div class="card kpi"><span>Locais</span><strong>${Number(summary.locais || 0)}</strong></div>
    <div class="card kpi"><span>Capacidade total</span><strong>${Number(summary.capacidade_total || 0)}</strong></div>
    <div class="card kpi"><span>Vagas disponíveis</span><strong>${Number(summary.vagas || 0)}</strong></div>
    <div class="card kpi"><span>Por atribuir</span><strong>${Number(summary.por_atribuir || 0)}</strong></div>
  </div>
  ${canManage ? `<div class="card panel logistics-quick-card">
    <div class="panel-header"><h3>Atribuição rápida</h3><span class="muted">Pesquise ou leia o QR da participante.</span></div>
    <div class="form-grid logistics-assign-grid">
      <label>Local<select id="accommodation-place"><option value="">Seleccione</option>${App.state.accommodations.filter(x => Number(x.vagas || 0) > 0 && x.activo !== false).map(x => UI.option(x.id_alojamento, `${x.nome} — ${x.vagas} vagas`)).join('')}</select></label>
      <label>Participante<input id="accommodation-query" autocomplete="off" placeholder="QR, inscrição, nome ou telefone"></label>
      <label>Quarto<input id="accommodation-room" placeholder="Ex.: Quarto 4"></label>
      <label>Cama<input id="accommodation-bed" placeholder="Ex.: Cama B"></label>
      <label>Data de entrada<input id="accommodation-start" type="date" value="${UI.escape(conference.data_inicio || '')}"></label>
      <label>Data de saída<input id="accommodation-end" type="date" value="${UI.escape(conference.data_fim || '')}"></label>
      <label class="span-2">Observações<input id="accommodation-notes" placeholder="Opcional"></label>
    </div>
    <div class="page-actions logistics-actions"><button id="accommodation-scan" class="btn btn-secondary">Ler QR</button><button id="accommodation-assign" class="btn btn-primary">Atribuir alojamento</button></div>
    <div id="accommodation-feedback"></div>
  </div>` : ''}
  <div class="card panel"><div class="panel-header"><h3>Locais de alojamento</h3><span class="muted">${App.state.accommodations.length} locais</span></div><div>${accommodationsTable(App.state.accommodations, canManage)}</div></div>
  <div class="card panel"><div class="panel-header"><h3>Participantes alojadas</h3><button id="accommodation-refresh" class="btn btn-secondary btn-sm">Actualizar</button></div><div>${accommodationAssignmentsTable(App.state.accommodationAssignments, canManage)}</div></div>`;

  if (canManage) {
    document.getElementById('new-accommodation').onclick = () => accommodationModal();
    document.querySelectorAll('.edit-accommodation').forEach(button => {
      button.onclick = () => accommodationModal(App.state.accommodations.find(item => item.id_alojamento === button.dataset.id));
    });
    document.querySelectorAll('.accommodation-status').forEach(button => {
      button.onclick = async () => {
        await Api.request('accommodations.setStatus', { id_atribuicao: button.dataset.id, estado: button.dataset.status });
        UI.toast('Estado do alojamento actualizado.');
        App.render('accommodations');
      };
    });
    UI.bindRangeValidation(App.container, 'unused', 'unused');
    const start = document.getElementById('accommodation-start');
    const end = document.getElementById('accommodation-end');
    const validateDates = () => {
      if (start.value) end.min = start.value; else end.removeAttribute('min');
      end.setCustomValidity(start.value && end.value && end.value < start.value ? 'A data de saída não pode ser anterior à data de entrada.' : '');
    };
    start.addEventListener('change', validateDates); end.addEventListener('change', validateDates); validateDates();
    document.getElementById('accommodation-assign').onclick = () => assignAccommodation().catch(error => UI.toast(error.message, 'error'));
    document.getElementById('accommodation-query').addEventListener('keydown', event => {
      if (event.key === 'Enter') { event.preventDefault(); assignAccommodation().catch(error => UI.toast(error.message, 'error')); }
    });
    document.getElementById('accommodation-scan').onclick = () => QRScanner.open({
      title: 'Ler QR para alojamento',
      onResult: async code => {
        document.getElementById('accommodation-query').value = code;
        await assignAccommodation();
      }
    });
  }
  document.getElementById('accommodation-refresh').onclick = () => App.render('accommodations');
};

function accommodationsTable(rows, canManage) {
  if (!rows.length) return UI.empty('Ainda não existem locais de alojamento registados.');
  return `<div class="table-wrap"><table><thead><tr><th>Local</th><th>Tipo</th><th>Responsável</th><th>Capacidade</th><th>Ocupadas</th><th>Vagas</th><th>Estado</th>${canManage ? '<th>Acções</th>' : ''}</tr></thead><tbody>${rows.map(row => `<tr>
    <td><strong>${UI.escape(row.nome || '')}</strong><br><small>${UI.escape(row.endereco || '—')}</small></td>
    <td>${UI.escape((row.tipo || 'OUTRO').replaceAll('_', ' '))}</td>
    <td>${UI.escape(row.responsavel || '—')}<br><small>${UI.escape(row.telefone || '')}</small></td>
    <td>${Number(row.capacidade || 0)}</td><td>${Number(row.ocupadas || 0)}</td><td><strong>${Number(row.vagas || 0)}</strong></td>
    <td>${UI.status(row.activo === false || String(row.activo).toUpperCase() === 'FALSE' ? 'INACTIVO' : 'ACTIVO')}</td>
    ${canManage ? `<td><button class="btn btn-secondary btn-sm edit-accommodation" data-id="${row.id_alojamento}">Editar</button></td>` : ''}
  </tr>`).join('')}</tbody></table></div>`;
}

function accommodationAssignmentsTable(rows, canManage) {
  if (!rows.length) return UI.empty('Ainda não existem participantes atribuídas a alojamentos.');
  return `<div class="table-wrap"><table><thead><tr><th>Participante</th><th>Alojamento</th><th>Quarto / Cama</th><th>Período</th><th>Distrito / Igreja</th><th>Estado</th>${canManage ? '<th>Acções</th>' : ''}</tr></thead><tbody>${rows.map(row => `<tr>
    <td><strong>${UI.escape(row.nome_completo || '')}</strong><br><small>${UI.escape(row.numero_inscricao || '')}</small></td>
    <td>${UI.escape(row.alojamento_nome || '')}</td>
    <td>${UI.escape(row.quarto || '—')}<br><small>${UI.escape(row.cama || '—')}</small></td>
    <td>${UI.date(row.data_entrada)} — ${UI.date(row.data_saida)}</td>
    <td>${UI.escape(row.distrito_nome || '—')}<br><small>${UI.escape(row.igreja_nome || '—')}</small></td>
    <td>${UI.status(row.estado || 'ATRIBUIDA')}</td>
    ${canManage ? `<td><div class="actions">${row.estado === 'ATRIBUIDA' ? `<button class="btn btn-secondary btn-sm accommodation-status" data-id="${row.id_atribuicao}" data-status="HOSPEDADA">Confirmar entrada</button>` : ''}${['ATRIBUIDA','HOSPEDADA'].includes(row.estado) ? `<button class="btn btn-secondary btn-sm accommodation-status" data-id="${row.id_atribuicao}" data-status="SAIDA">Registar saída</button><button class="btn btn-danger btn-sm accommodation-status" data-id="${row.id_atribuicao}" data-status="CANCELADA">Cancelar</button>` : ''}</div></td>` : ''}
  </tr>`).join('')}</tbody></table></div>`;
}

function accommodationModal(place = {}) {
  UI.modal({
    title: place.id_alojamento ? 'Editar local de alojamento' : 'Novo local de alojamento',
    body: `<div class="form-grid">
      <label>Nome<input name="nome" value="${UI.escape(place.nome || '')}" required></label>
      <label>Tipo<select name="tipo">${['HOTEL','PENSAO','INTERNATO','RESIDENCIA','IGREJA','CASA','OUTRO'].map(value => UI.option(value, value.replaceAll('_',' '), place.tipo || 'HOTEL')).join('')}</select></label>
      <label class="span-2">Endereço<input name="endereco" value="${UI.escape(place.endereco || '')}"></label>
      <label>Responsável<input name="responsavel" value="${UI.escape(place.responsavel || '')}"></label>
      <label>Telefone<input name="telefone" value="${UI.escape(place.telefone || '')}"></label>
      <label>Capacidade<input name="capacidade" type="number" min="1" step="1" value="${Number(place.capacidade || 1)}" required></label>
      <label>Estado<select name="activo">${UI.option('true','Activo', place.activo === false ? 'false' : 'true')}${UI.option('false','Inactivo', place.activo === false ? 'false' : 'true')}</select></label>
      <label class="span-2">Observações<textarea name="observacoes">${UI.escape(place.observacoes || '')}</textarea></label>
    </div>`,
    onSubmit: async data => {
      data.id_conferencia = App.state.conferenceId;
      data.activo = data.activo === 'true';
      if (place.id_alojamento) data.id_alojamento = place.id_alojamento;
      await Api.request('accommodations.save', data);
      UI.toast('Local de alojamento guardado.');
      App.render('accommodations');
    }
  });
}

async function assignAccommodation() {
  const placeId = document.getElementById('accommodation-place').value;
  const query = document.getElementById('accommodation-query').value;
  if (!placeId) throw new Error('Seleccione o local de alojamento.');
  const participant = await lookupSingleLogisticsParticipant(query);
  await Api.request('accommodations.assign', {
    id_conferencia: App.state.conferenceId,
    id_alojamento: placeId,
    id_inscricao: participant.id_inscricao,
    quarto: document.getElementById('accommodation-room').value,
    cama: document.getElementById('accommodation-bed').value,
    data_entrada: document.getElementById('accommodation-start').value,
    data_saida: document.getElementById('accommodation-end').value,
    observacoes: document.getElementById('accommodation-notes').value
  });
  document.getElementById('accommodation-feedback').innerHTML = `<div class="attendance-success"><strong>${UI.escape(participant.nome_completo)}</strong><span>Alojamento atribuído com sucesso.</span><small>${UI.escape(participant.numero_inscricao || '')} · ${UI.escape(participant.igreja_nome || '')}</small></div>`;
  UI.toast('Alojamento atribuído.');
  setTimeout(() => App.render('accommodations'), 700);
}
