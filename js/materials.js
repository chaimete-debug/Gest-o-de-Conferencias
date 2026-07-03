Views.materials = async function () {
  const [materialsResult, deliveriesResult] = await Promise.all([
    Api.request('materials.list', { id_conferencia: App.state.conferenceId, pageSize: 500 }),
    Api.request('materials.deliveries', { id_conferencia: App.state.conferenceId, pageSize: 200 })
  ]);
  App.state.materials = materialsResult.items || [];
  App.state.materialDeliveries = deliveriesResult.items || [];
  const canManage = Auth.can('materiais.gerir');

  App.container.innerHTML = `<div class="page-header">
    <div><span class="eyebrow">Stock e distribuição</span><h1>Materiais</h1><p class="muted">Controle credenciais, pastas, camisetas e outros materiais entregues às participantes.</p></div>
    <div class="page-actions">${canManage ? '<button id="new-material" class="btn btn-primary">Novo material</button>' : ''}</div>
  </div>
  ${canManage ? `<div class="card panel quick-delivery">
    <div class="panel-header"><h3>Entrega rápida</h3><span class="muted">Use o QR ou número de inscrição.</span></div>
    <div class="form-grid material-delivery-grid">
      <label>Material<select id="delivery-material"><option value="">Seleccione</option>${App.state.materials.filter(m => Number(m.stock_actual || 0) > 0).map(m => UI.option(m.id_material, `${m.nome}${m.tamanho ? ` — ${m.tamanho}` : ''} (stock: ${m.stock_actual})`)).join('')}</select></label>
      <label>Quantidade<input id="delivery-quantity" type="number" min="1" step="1" value="1"></label>
      <label class="span-2">Participante<input id="delivery-code" autocomplete="off" placeholder="Código QR, número de inscrição, nome ou telefone"></label>
      <label class="span-2">Observações<input id="delivery-notes" placeholder="Opcional"></label>
    </div>
    <div class="page-actions material-delivery-actions"><button id="delivery-scan" class="btn btn-secondary">Ler QR</button><button id="delivery-submit" class="btn btn-primary">Registar entrega</button></div>
    <div id="delivery-feedback"></div>
  </div>` : ''}
  <div class="card panel"><div class="panel-header"><h3>Inventário</h3><span class="muted">${App.state.materials.length} materiais</span></div><div id="materials-table">${materialsTable(App.state.materials, canManage)}</div></div>
  <div class="card panel"><div class="panel-header"><h3>Últimas entregas</h3><button id="deliveries-refresh" class="btn btn-secondary btn-sm">Actualizar</button></div><div id="deliveries-table">${materialDeliveriesTable(App.state.materialDeliveries)}</div></div>`;

  if (canManage) {
    document.getElementById('new-material').onclick = () => materialModal();
    document.querySelectorAll('.edit-material').forEach(button => {
      button.onclick = () => materialModal(App.state.materials.find(item => item.id_material === button.dataset.id));
    });
    document.getElementById('delivery-submit').onclick = () => deliverMaterialQuick().catch(error => UI.toast(error.message, 'error'));
    document.getElementById('delivery-code').addEventListener('keydown', event => {
      if (event.key === 'Enter') { event.preventDefault(); deliverMaterialQuick().catch(error => UI.toast(error.message, 'error')); }
    });
    document.getElementById('delivery-scan').onclick = () => QRScanner.open({
      title: 'Ler QR para entrega de material',
      onResult: async code => {
        document.getElementById('delivery-code').value = code;
        await deliverMaterialQuick();
      }
    });
  }
  document.getElementById('deliveries-refresh').onclick = () => App.render('materials');
};

function materialsTable(rows, canManage) {
  if (!rows.length) return UI.empty('Ainda não foram registados materiais para esta conferência.');
  return `<div class="table-wrap"><table><thead><tr><th>Código</th><th>Material</th><th>Tipo / Tamanho</th><th>Stock inicial</th><th>Entregue</th><th>Disponível</th><th>Estado</th>${canManage ? '<th>Acções</th>' : ''}</tr></thead><tbody>${rows.map(row => `<tr>
    <td><strong>${UI.escape(row.codigo || '')}</strong></td>
    <td>${UI.escape(row.nome || '')}</td>
    <td>${UI.escape(row.tipo || '—')}${row.tamanho ? `<br><small>${UI.escape(row.tamanho)}</small>` : ''}</td>
    <td>${Number(row.stock_inicial || 0)}</td>
    <td>${Number(row.total_entregue || 0)}</td>
    <td><strong>${Number(row.stock_actual || 0)}</strong></td>
    <td>${UI.status(row.activo ? 'ACTIVO' : 'INACTIVO')}</td>
    ${canManage ? `<td><button class="btn btn-secondary btn-sm edit-material" data-id="${row.id_material}">Editar</button></td>` : ''}
  </tr>`).join('')}</tbody></table></div>`;
}

function materialDeliveriesTable(rows) {
  if (!rows.length) return UI.empty('Ainda não existem entregas de materiais.');
  return `<div class="table-wrap"><table><thead><tr><th>Data</th><th>Participante</th><th>Inscrição</th><th>Material</th><th>Quantidade</th><th>Distrito / Igreja</th></tr></thead><tbody>${rows.map(row => `<tr>
    <td>${formatDateTimeAttendance(row.data_entrega)}</td>
    <td><strong>${UI.escape(row.nome_completo || '')}</strong></td>
    <td>${UI.escape(row.numero_inscricao || '')}</td>
    <td>${UI.escape(row.material_nome || '')}${row.material_tamanho ? `<br><small>${UI.escape(row.material_tamanho)}</small>` : ''}</td>
    <td>${Number(row.quantidade || 0)}</td>
    <td>${UI.escape(row.distrito_nome || '—')}<br><small>${UI.escape(row.igreja_nome || '—')}</small></td>
  </tr>`).join('')}</tbody></table></div>`;
}

function materialModal(material = {}) {
  UI.modal({
    title: material.id_material ? 'Editar material' : 'Novo material',
    body: `<div class="form-grid">
      <label>Código<input name="codigo" value="${UI.escape(material.codigo || '')}" placeholder="Gerado automaticamente se ficar vazio"></label>
      <label>Nome<input name="nome" value="${UI.escape(material.nome || '')}" required></label>
      <label>Tipo<select name="tipo">${['CREDENCIAL','PASTA','CAMISETA','BLOCO','CANETA','SENHA_ALIMENTACAO','OUTRO'].map(value => UI.option(value, value.replaceAll('_',' '), material.tipo)).join('')}</select></label>
      <label>Tamanho / Variante<input name="tamanho" value="${UI.escape(material.tamanho || '')}" placeholder="Ex.: M, G, Azul"></label>
      <label>Stock inicial<input name="stock_inicial" type="number" min="0" step="1" value="${Number(material.stock_inicial || 0)}" required></label>
      <label>Estado<select name="activo">${UI.option('true','Activo',(material.activo === false || String(material.activo).toUpperCase() === 'FALSE') ? 'false' : 'true')}${UI.option('false','Inactivo',(material.activo === false || String(material.activo).toUpperCase() === 'FALSE') ? 'false' : 'true')}</select></label>
    </div>`,
    onSubmit: async data => {
      data.id_conferencia = App.state.conferenceId;
      data.activo = data.activo === 'true';
      if (material.id_material) data.id_material = material.id_material;
      await Api.request('materials.save', data);
      UI.toast('Material guardado.');
      App.render('materials');
    }
  });
}

async function deliverMaterialQuick() {
  const materialId = document.getElementById('delivery-material').value;
  const quantity = Number(document.getElementById('delivery-quantity').value || 0);
  const query = document.getElementById('delivery-code').value.trim();
  const observations = document.getElementById('delivery-notes').value.trim();
  if (!materialId) throw new Error('Seleccione o material.');
  if (!quantity || quantity < 1) throw new Error('Indique uma quantidade válida.');
  if (!query) throw new Error('Indique ou leia o código da participante.');

  const lookup = await Api.request('registrations.lookup', {
    id_conferencia: App.state.conferenceId,
    query
  });
  if (!lookup.items?.length) throw new Error('Participante não encontrada.');
  if (lookup.items.length > 1) throw new Error('Foram encontradas várias participantes. Use o número de inscrição ou QR.');
  const participant = lookup.items[0];

  await Api.request('materials.deliver', {
    id_conferencia: App.state.conferenceId,
    id_material: materialId,
    id_inscricao: participant.id_inscricao,
    quantidade: quantity,
    observacoes: observations
  });

  document.getElementById('delivery-feedback').innerHTML = `<div class="attendance-success"><strong>${UI.escape(participant.nome_completo)}</strong><span>Entrega registada com sucesso.</span><small>${UI.escape(participant.numero_inscricao)} · ${UI.escape(participant.igreja_nome || '')}</small></div>`;
  UI.toast('Entrega de material registada.');
  setTimeout(() => App.render('materials'), 700);
}
