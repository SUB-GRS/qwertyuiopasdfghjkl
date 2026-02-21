(function () {
  'use strict';

  /* CURTAIN */
  var curtain = document.getElementById('curtain');
  var busy = false;
  function openCurtain(cb) {
    curtain.classList.remove('out');
    void curtain.offsetWidth;
    curtain.classList.add('in');
    setTimeout(cb, 750);
  }
  function closeCurtain() {
    curtain.classList.remove('in');
    void curtain.offsetWidth;
    curtain.classList.add('out');
    setTimeout(function () { curtain.classList.remove('out'); }, 760);
  }
  document.querySelectorAll('a[href]').forEach(function (link) {
    var href = link.getAttribute('href');
    if (!href || href === '#' || href.charAt(0) === '#') return;
    var ext = link.target === '_blank' || href.indexOf('http') === 0 || href.indexOf('//') === 0;
    link.addEventListener('click', function (e) {
      if (busy) { e.preventDefault(); return; }
      e.preventDefault(); busy = true;
      openCurtain(function () {
        if (ext) { window.open(href, '_blank'); busy = false; closeCurtain(); }
        else { window.location.href = href; }
      });
    });
  });

  document.getElementById('yr').textContent = new Date().getFullYear();

  /* STATE */
  var selectedFile = null;
  var isDeploying = false;

  /* ELEMENTS */
  var dropZone   = document.getElementById('dropZone');
  var fileInput  = document.getElementById('fileInput');
  var filePreview = document.getElementById('filePreview');
  var fpName     = document.getElementById('fpName');
  var fpSize     = document.getElementById('fpSize');
  var removeFile = document.getElementById('removeFile');
  var subdomain  = document.getElementById('subdomain');
  var deployBtn  = document.getElementById('deployBtn');
  var progressWrap = document.getElementById('progressWrap');
  var progFill   = document.getElementById('progFill');
  var progPct    = document.getElementById('progPct');
  var progLog    = document.getElementById('progLog');
  var resultBox  = document.getElementById('resultBox');
  var resTitle   = document.getElementById('resTitle');
  var resContent = document.getElementById('resContent');

  /* FORMAT SIZE */
  function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  /* SET FILE */
  function setFile(file) {
    if (!file || !file.name.endsWith('.zip')) {
      addLog('err', 'File harus berformat .zip!');
      return;
    }
    selectedFile = file;
    fpName.textContent = file.name;
    fpSize.textContent = formatSize(file.size);
    filePreview.classList.add('show');
    dropZone.classList.add('has-file');
    checkReady();
  }

  /* CLEAR FILE */
  function clearFile() {
    selectedFile = null;
    fileInput.value = '';
    filePreview.classList.remove('show');
    dropZone.classList.remove('has-file');
    checkReady();
  }

  /* CHECK READY */
  function checkReady() {
    deployBtn.disabled = !selectedFile || isDeploying;
  }

  /* ADD LOG */
  function addLog(type, msg) {
    var now = new Date();
    var ts = now.toTimeString().slice(0, 8);
    var entry = document.createElement('div');
    entry.className = 'log-entry ' + type;
    entry.innerHTML = '<span class="log-ts">' + ts + '</span><span class="log-msg">' + msg + '</span>';
    progLog.appendChild(entry);
    progLog.scrollTop = progLog.scrollHeight;
  }

  /* SET PROGRESS */
  function setProgress(pct) {
    progFill.style.width = pct + '%';
    progPct.textContent = pct + '%';
  }

  /* DROPZONE EVENTS */
  dropZone.addEventListener('dragover', function (e) {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });
  dropZone.addEventListener('dragleave', function () {
    dropZone.classList.remove('drag-over');
  });
  dropZone.addEventListener('drop', function (e) {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    var f = e.dataTransfer.files[0];
    if (f) setFile(f);
  });
  fileInput.addEventListener('change', function () {
    if (fileInput.files[0]) setFile(fileInput.files[0]);
  });
  removeFile.addEventListener('click', function (e) {
    e.stopPropagation();
    clearFile();
  });

  /* DEPLOY */
  deployBtn.addEventListener('click', function () {
    if (!selectedFile || isDeploying) return;
    startDeploy();
  });

  async function startDeploy() {
    isDeploying = true;
    deployBtn.disabled = true;
    deployBtn.classList.add('loading');

    // Reset UI
    progressWrap.classList.add('show');
    progLog.innerHTML = '';
    resultBox.classList.remove('show', 'is-error');
    resultBox.style.display = 'none';
    setProgress(0);

    var domain = subdomain.value.trim();
    if (domain) {
      domain = domain.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/^-+|-+$/g, '');
    }

    addLog('info', 'Mempersiapkan upload...');
    setProgress(10);

    try {
      var formData = new FormData();
      formData.append('zipfile', selectedFile);
      if (domain) formData.append('domain', domain);

      addLog('info', 'Mengirim file ke server (' + formatSize(selectedFile.size) + ')...');
      setProgress(25);

      var res = await fetch('/api/deploy/surge', {
        method: 'POST',
        body: formData
      });

      setProgress(60);
      addLog('info', 'File diterima, sedang deploy ke Surge.sh...');

      var data = await res.json();

      setProgress(90);

      if (!res.ok || !data.status) {
        throw new Error(data.message || 'Deploy gagal');
      }

      setProgress(100);
      addLog('ok', 'Deploy berhasil! URL: ' + data.url);
      addLog('ok', 'File ZIP telah dikirim ke owner via Telegram ✅');

      showResult(data.url);

    } catch (err) {
      setProgress(100);
      addLog('err', 'Error: ' + err.message);
      showError(err.message);
    } finally {
      isDeploying = false;
      deployBtn.classList.remove('loading');
      checkReady();
    }
  }

  function showResult(url) {
    resultBox.classList.remove('is-error');
    resTitle.innerHTML = '✅ &nbsp;Berhasil Di-deploy!';
    resContent.innerHTML =
      '<div class="res-url-row">' +
        '<div class="res-url" id="resUrl">' + url + '</div>' +
        '<button class="btn-sm btn-copy-url" id="copyUrlBtn"><span class="material-icons">content_copy</span>Salin</button>' +
        '<button class="btn-sm btn-open-url" id="openUrlBtn"><span class="material-icons">open_in_new</span>Buka</button>' +
      '</div>' +
      '<div class="tg-note"><span class="material-icons">send</span>File ZIP kamu sudah dikirim ke owner via Telegram</div>';

    resultBox.style.display = 'block';
    resultBox.classList.add('show');

    document.getElementById('copyUrlBtn').addEventListener('click', function () {
      navigator.clipboard.writeText(url).then(function () {
        document.getElementById('copyUrlBtn').innerHTML = '<span class="material-icons">check</span>Tersalin';
        setTimeout(function () {
          document.getElementById('copyUrlBtn').innerHTML = '<span class="material-icons">content_copy</span>Salin';
        }, 2000);
      });
    });

    document.getElementById('openUrlBtn').addEventListener('click', function () {
      window.open(url, '_blank');
    });
  }

  function showError(msg) {
    resultBox.classList.add('is-error');
    resTitle.innerHTML = '❌ &nbsp;Deploy Gagal';
    resContent.innerHTML = '<div class="res-err-msg">' + msg + '<br><br><small style="color:var(--ink3)">Cek log di atas untuk detail error.</small></div>';
    resultBox.style.display = 'block';
    resultBox.classList.add('show');
  }

}());
