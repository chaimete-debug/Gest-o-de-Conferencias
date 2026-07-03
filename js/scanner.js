window.QRScanner = {
  async open({title='Ler código QR', onResult}) {
    const root = document.getElementById('modal-root');
    root.innerHTML = `<div class="modal-overlay"><div class="modal scanner-modal">
      <div class="modal-header"><h2>${UI.escape(title)}</h2><button class="close-btn" type="button">×</button></div>
      <div class="modal-body">
        <div class="scanner-frame"><video id="qr-video" playsinline muted></video><div class="scanner-guide"></div></div>
        <p id="scanner-message" class="muted">A iniciar a câmara…</p>
        <div class="scanner-manual">
          <label>Código ou número de inscrição<input id="scanner-manual-code" autocomplete="off" placeholder="Ex.: CMNM-2026-00001"></label>
          <button id="scanner-manual-submit" class="btn btn-primary" type="button">Confirmar código</button>
        </div>
      </div>
      <div class="modal-footer"><button class="btn btn-ghost close-action" type="button">Fechar</button></div>
    </div></div>`;

    const video = root.querySelector('#qr-video');
    const message = root.querySelector('#scanner-message');
    const manual = root.querySelector('#scanner-manual-code');
    let stream = null;
    let timer = null;
    let busy = false;

    const close = () => {
      if (timer) clearInterval(timer);
      if (stream) stream.getTracks().forEach(track => track.stop());
      root.innerHTML = '';
    };

    const accept = async code => {
      const value = String(code || '').trim();
      if (!value || busy) return;
      busy = true;
      try {
        await onResult(value);
        close();
      } catch (error) {
        UI.toast(error.message, 'error');
        busy = false;
      }
    };

    root.querySelector('.close-btn').onclick = close;
    root.querySelector('.close-action').onclick = close;
    root.querySelector('.modal-overlay').addEventListener('click', event => {
      if (event.target.classList.contains('modal-overlay')) close();
    });
    root.querySelector('#scanner-manual-submit').onclick = () => accept(manual.value);
    manual.addEventListener('keydown', event => {
      if (event.key === 'Enter') { event.preventDefault(); accept(manual.value); }
    });

    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Este dispositivo não disponibiliza acesso à câmara.');
      if (!('BarcodeDetector' in window)) throw new Error('A leitura automática de QR não é suportada neste navegador. Use o campo manual.');
      const supported = await BarcodeDetector.getSupportedFormats();
      if (!supported.includes('qr_code')) throw new Error('Este navegador não suporta leitura de códigos QR. Use o campo manual.');

      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false
      });
      video.srcObject = stream;
      await video.play();
      message.textContent = 'Aponte a câmara para o código QR da credencial.';
      const detector = new BarcodeDetector({ formats: ['qr_code'] });
      timer = setInterval(async () => {
        if (busy || video.readyState < 2) return;
        try {
          const codes = await detector.detect(video);
          if (codes?.length) accept(codes[0].rawValue);
        } catch (_) {}
      }, 450);
    } catch (error) {
      message.textContent = error.message;
      message.classList.add('scanner-warning');
      manual.focus();
    }
  }
};
