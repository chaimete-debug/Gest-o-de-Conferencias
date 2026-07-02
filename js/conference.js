Views.conference = async function(){
  const list=await Api.request('conferences.list',{pageSize:100});const current=list.items.find(x=>x.id_conferencia===App.state.conferenceId)||list.items[0];
  App.container.innerHTML=`<div class="page-header"><div><span class="eyebrow">Configuração</span><h1>Conferência</h1><p class="muted">Dados gerais e período de realização.</p></div><div class="page-actions"><button id="edit-conference" class="btn btn-primary">${current?'Editar conferência':'Criar conferência'}</button></div></div>${current?`<div class="card panel"><div class="form-grid"><div><span class="muted">Nome</span><h3>${UI.escape(current.nome)}</h3></div><div><span class="muted">Estado</span><p>${UI.status(current.estado)}</p></div><div><span class="muted">Tema</span><p>${UI.escape(current.tema||'—')}</p></div><div><span class="muted">Lema</span><p>${UI.escape(current.lema||'—')}</p></div><div><span class="muted">Local</span><p>${UI.escape(current.local||'—')}</p></div><div><span class="muted">Datas</span><p>${UI.date(current.data_inicio)} — ${UI.date(current.data_fim)}</p></div><div><span class="muted">Valor da inscrição</span><p>${UI.money(current.valor_inscricao)}</p></div><div><span class="muted">Capacidade</span><p>${UI.escape(current.capacidade||'—')}</p></div></div></div>`:UI.empty('Crie a primeira conferência.')}`;
  document.getElementById('edit-conference').onclick=()=>conferenceModal(current);
};

function conferenceModal(c={}){
  const modalRoot=UI.modal({
    title:c?.id_conferencia?'Editar conferência':'Nova conferência',
    body:`<div class="form-grid"><label>Código<input name="codigo" value="${UI.escape(c?.codigo||'CMNM-2026')}" required></label><label>Estado<select name="estado">${['EM_PREPARACAO','INSCRICOES_ABERTAS','INSCRICOES_ENCERRADAS','EM_CURSO','CONCLUIDA','CANCELADA'].map(x=>UI.option(x,x.replaceAll('_',' '),c?.estado)).join('')}</select></label><label class="span-2">Nome<input name="nome" value="${UI.escape(c?.nome||'')}" required></label><label>Tema<input name="tema" value="${UI.escape(c?.tema||'')}"></label><label>Lema<input name="lema" value="${UI.escape(c?.lema||'')}"></label><label>Texto bíblico<input name="texto_biblico" value="${UI.escape(c?.texto_biblico||'')}"></label><label>Local<input name="local" value="${UI.escape(c?.local||'')}"></label><label>Data de início<input type="date" name="data_inicio" value="${String(c?.data_inicio||'').slice(0,10)}"></label><label>Data de encerramento<input type="date" name="data_fim" value="${String(c?.data_fim||'').slice(0,10)}"></label><label>Início das inscrições<input type="date" name="inscricoes_inicio" value="${String(c?.inscricoes_inicio||'').slice(0,10)}"></label><label>Fim das inscrições<input type="date" name="inscricoes_fim" value="${String(c?.inscricoes_fim||'').slice(0,10)}"></label><label>Valor da inscrição<input type="number" min="0" step="0.01" name="valor_inscricao" value="${c?.valor_inscricao||0}"></label><label>Capacidade<input type="number" min="0" name="capacidade" value="${c?.capacidade||0}"></label><label>Contacto responsável<input name="contacto_nome" value="${UI.escape(c?.contacto_nome||'')}"></label><label>Telefone<input name="contacto_telefone" value="${UI.escape(c?.contacto_telefone||'')}"></label></div>`,
    onSubmit:async data=>{if(c?.id_conferencia)data.id_conferencia=c.id_conferencia;await Api.request('conferences.save',data);UI.toast('Conferência guardada.');await App.loadLookups();App.render('conference');}
  });

  UI.bindRangeValidation(modalRoot,'data_inicio','data_fim',{
    message:'A data de encerramento não pode ser anterior à data de início da conferência.'
  });
  UI.bindRangeValidation(modalRoot,'inscricoes_inicio','inscricoes_fim',{
    message:'A data de fim das inscrições não pode ser anterior à data de início das inscrições.'
  });
}
