Views.users = async function () {
  const result = await Api.request('users.list', { pageSize: 500 });
  App.state.users = result.items;

  App.container.innerHTML = `
    <div class="page-header">
      <div>
        <span class="eyebrow">Administração</span>
        <h1>Utilizadores</h1>
        <p class="muted">Contas, perfis e âmbito de acesso.</p>
      </div>
      <div class="page-actions">
        <button id="new-user" class="btn btn-primary">Novo utilizador</button>
      </div>
    </div>
    ${usersTable(result.items)}
  `;

  document.getElementById('new-user').onclick = () => userModal();
  document.querySelectorAll('.edit-user').forEach(button => {
    button.onclick = () => userModal(
      App.state.users.find(user => user.id_utilizador === button.dataset.id)
    );
  });
};

function usersTable(rows) {
  if (!rows.length) return UI.empty();

  return `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Nome</th>
            <th>Utilizador</th>
            <th>Perfil</th>
            <th>Âmbito de acesso</th>
            <th>Contacto</th>
            <th>Estado</th>
            <th>Acções</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(user => `
            <tr>
              <td><strong>${UI.escape(user.nome)}</strong></td>
              <td>${UI.escape(user.username)}</td>
              <td>${UI.escape(user.perfil_nome || user.perfil_id)}</td>
              <td>
                ${UI.escape(user.distrito_nome || (user.id_distrito ? user.id_distrito : 'Todos os distritos'))}
                <br>
                <small>${UI.escape(user.igreja_nome || (user.id_igreja ? user.id_igreja : (user.id_distrito ? 'Todas as igrejas do distrito' : 'Todas as igrejas')))}</small>
              </td>
              <td>
                ${UI.escape(user.email || '—')}
                <br>
                <small>${UI.escape(user.telefone || '')}</small>
              </td>
              <td>${UI.status(user.activo ? 'ACTIVO' : 'INACTIVO')}</td>
              <td>
                <button class="btn btn-secondary btn-sm edit-user" data-id="${UI.escape(user.id_utilizador)}">Editar</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function userModal(user = {}) {
  const lookups = App.state.lookups || {};
  const districts = [...(lookups.districts || [])]
    .sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt'));
  const churches = [...(lookups.churches || [])]
    .sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt'));
  const profiles = [...(lookups.profiles || [])]
    .sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt'));

  // Ao editar, recupera o distrito da igreja caso o registo antigo não o tenha gravado.
  const selectedChurch = churches.find(
    church => String(church.id_igreja) === String(user.id_igreja || '')
  );
  const initialDistrict = user.id_distrito || selectedChurch?.id_distrito || '';
  const initialChurch = user.id_igreja || '';

  const modalRoot = UI.modal({
    title: user.id_utilizador ? 'Editar utilizador' : 'Novo utilizador',
    body: `
      <div class="form-grid">
        <label class="span-2">
          Nome
          <input name="nome" value="${UI.escape(user.nome || '')}" required>
        </label>

        <label>
          Nome de utilizador
          <input name="username" value="${UI.escape(user.username || '')}" required>
        </label>

        <label>
          Perfil
          <select name="perfil_id" required>
            ${profiles.map(profile => UI.option(
              profile.id_perfil,
              profile.nome,
              user.perfil_id
            )).join('')}
          </select>
        </label>

        <label>
          Correio electrónico
          <input type="email" name="email" value="${UI.escape(user.email || '')}">
        </label>

        <label>
          Telefone
          <input name="telefone" value="${UI.escape(user.telefone || '')}">
        </label>

        <label>
          Distrito
          <select name="id_distrito">
            <option value="">Todos os distritos</option>
            ${districts.map(district => UI.option(
              district.id_distrito,
              district.nome,
              initialDistrict
            )).join('')}
          </select>
        </label>

        <label>
          Igreja
          <select name="id_igreja"></select>
        </label>

        <label class="span-2">
          ${user.id_utilizador
            ? 'Nova palavra-passe (deixar em branco para manter)'
            : 'Palavra-passe inicial'}
          <input
            type="password"
            name="password"
            ${user.id_utilizador ? '' : 'required'}
            minlength="8"
          >
        </label>

        <div class="span-2 check-row">
          <label>
            <input type="checkbox" name="activo" ${user.activo !== false ? 'checked' : ''}>
            Conta activa
          </label>
        </div>
      </div>
    `,
    onSubmit: async data => {
      // Uma igreja só pode ser submetida quando pertence ao distrito escolhido.
      if (!data.id_distrito) data.id_igreja = '';

      if (data.id_igreja) {
        const selected = churches.find(
          church => String(church.id_igreja) === String(data.id_igreja)
        );
        if (!selected || String(selected.id_distrito) !== String(data.id_distrito)) {
          throw new Error('A igreja seleccionada não pertence ao distrito indicado.');
        }
      }

      if (user.id_utilizador) {
        data.id_utilizador = user.id_utilizador;
        await Api.request('users.update', data);
      } else {
        await Api.request('users.create', data);
      }

      UI.toast('Utilizador guardado.');
      App.render('users');
    }
  });

  const districtSelect = modalRoot.querySelector('[name="id_distrito"]');
  const churchSelect = modalRoot.querySelector('[name="id_igreja"]');

  const renderChurches = (districtId, selectedId = '') => {
    if (!districtId) {
      churchSelect.innerHTML = '<option value="">Todas as igrejas</option>';
      churchSelect.value = '';
      churchSelect.disabled = true;
      return;
    }

    const filteredChurches = churches.filter(
      church => String(church.id_distrito) === String(districtId)
    );

    churchSelect.disabled = false;
    churchSelect.innerHTML = `
      <option value="">Todas as igrejas do distrito</option>
      ${filteredChurches.map(church => UI.option(
        church.id_igreja,
        church.nome,
        selectedId
      )).join('')}
    `;

    // Evita manter uma igreja de outro distrito ao mudar o distrito.
    const selectedStillValid = filteredChurches.some(
      church => String(church.id_igreja) === String(selectedId)
    );
    churchSelect.value = selectedStillValid ? String(selectedId) : '';
  };

  renderChurches(initialDistrict, initialChurch);

  districtSelect.addEventListener('change', () => {
    renderChurches(districtSelect.value, '');
  });
}
