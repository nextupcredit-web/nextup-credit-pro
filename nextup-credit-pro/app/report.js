/* NextUp Credit Pro - credit report scan + accounts list for one client.
   The PDF is read in the browser. Only its TEXT is sent to the scan-report function (which holds the AI key). */
(function () {
  var MAX_MB = 15, MAX_PAGES = 60;
  var BUREAUS = { EQ: 'Equifax', EX: 'Experian', TU: 'TransUnion' };

  function el(tag, attrs, kids) {
    var e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { if (k === 'text') e.textContent = attrs[k]; else e.setAttribute(k, attrs[k]); });
    (kids || []).forEach(function (c) { e.appendChild(c); });
    return e;
  }

  var pdfLib = null;
  function loadPdf() {
    if (pdfLib) return Promise.resolve(pdfLib);
    return import('./vendor/pdfjs/pdf.min.mjs').then(function (m) {
      m.GlobalWorkerOptions.workerSrc = new URL('vendor/pdfjs/pdf.worker.min.mjs', document.baseURI).href;
      pdfLib = m; return m;
    });
  }

  function extractText(file) {
    return file.arrayBuffer().then(function (buf) {
      return loadPdf().then(function (lib) {
        return lib.getDocument({ data: buf }).promise.then(function (doc) {
          var n = Math.min(doc.numPages, MAX_PAGES), parts = [], p = Promise.resolve();
          for (var i = 1; i <= n; i++) {
            (function (i) {
              p = p.then(function () { return doc.getPage(i); }).then(function (pg) { return pg.getTextContent(); }).then(function (tc) {
                parts.push(tc.items.map(function (it) { return it.str; }).join(' '));
              });
            })(i);
          }
          return p.then(function () { return parts.join('\n'); });
        });
      });
    });
  }

  function errText(err) {
    if (err && err.context && typeof err.context.json === 'function') {
      return err.context.json().then(function (j) { return (j && j.error) || 'Scan failed.'; }, function () { return 'Scan failed.'; });
    }
    return Promise.resolve('Scan failed. Please try again.');
  }

  function mount(box, ctx) {
    var sb = ctx.sb, clientId = ctx.clientId, prof = ctx.prof, user = ctx.user;
    var status = el('p', { class: 'sub', role: 'status' });
    var results = el('div', { id: 'scanres' });
    var saved = el('div', { id: 'savedaccts', class: 'list' });
    var file = el('input', { id: 'rf', type: 'file', accept: 'application/pdf' });
    var go = el('button', { class: 'btn', type: 'button', text: 'Scan report' });

    box.appendChild(el('h2', { text: 'Credit report' }));
    box.appendChild(el('p', { class: 'sub', text: 'Upload the 3-bureau report as a PDF. It is read in your browser and only the text is sent to the scanner. Each client can be scanned twice a month.' }));
    box.appendChild(el('label', { for: 'rf' }, [document.createTextNode('Report PDF'), file]));
    box.appendChild(go); box.appendChild(status); box.appendChild(results);
    box.appendChild(el('h2', { text: 'Accounts on file' })); box.appendChild(saved);

    function loadSaved() {
      sb.from('accounts').select('id,creditor,acct_type,acct_last4,acct_number,bureau,decision').eq('client_id', clientId).order('created_at', { ascending: true }).limit(500).then(function (r) {
        saved.textContent = '';
        if (r.error) { saved.appendChild(el('p', { class: 'sub', text: 'Could not load accounts.' })); return; }
        if (!r.data.length) { saved.appendChild(el('p', { class: 'sub', text: 'No accounts saved yet.' })); return; }
        r.data.forEach(function (a) {
          var sel = el('select', { 'aria-label': 'Decision for ' + a.creditor, class: 'mini' }, [
            el('option', { value: 'dispute', text: 'Dispute' }), el('option', { value: 'ignore', text: 'Ignore' })]);
          sel.value = a.decision === 'dispute' ? 'dispute' : 'ignore';
          sel.addEventListener('change', function () {
            sel.disabled = true;
            sb.from('accounts').update({ decision: sel.value }).eq('id', a.id).then(function (u) { sel.disabled = false; if (u.error) { loadSaved(); } });
          });
          saved.appendChild(el('div', { class: 'row' }, [
            el('div', {}, [el('strong', { text: a.creditor || 'Account' }),
              el('div', { class: 'sub', text: [a.acct_type, a.acct_number ? 'no. ' + a.acct_number : (a.acct_last4 ? 'ending ' + a.acct_last4 : ''), BUREAUS[a.bureau] || a.bureau].filter(Boolean).join(' · ') })]), sel]));
        });
      });
    }
    loadSaved();

    function showResults(d) {
      results.textContent = '';
      var sc = d.scores || {}, bits = Object.keys(BUREAUS).filter(function (k) { return sc[k]; }).map(function (k) { return BUREAUS[k] + ' ' + sc[k]; });
      if (bits.length) results.appendChild(el('p', { class: 'sub', text: 'Scores found on the report: ' + bits.join(' · ') + '. (Agents record scores on the client file.)' }));
      if (!d.accounts || !d.accounts.length) { results.appendChild(el('p', { class: 'sub', text: 'No negative or questionable accounts were found.' })); return; }
      results.appendChild(el('h2', { text: 'Found ' + d.accounts.length + ' accounts. Choose what to dispute.' }));
      var boxes = [];
      var list = el('div', { class: 'list' });
      d.accounts.forEach(function (a) {
        var cb = el('input', { type: 'checkbox', 'aria-label': 'Dispute ' + a.creditor, class: 'cb' });
        if (a.recommend === 'dispute') cb.checked = true;
        boxes.push(cb);
        var det = [a.acct_type, a.acct_number ? 'no. ' + a.acct_number : (a.last4 ? 'ending ' + a.last4 : ''), (a.bureaus || []).map(function (b) { return BUREAUS[b]; }).join(', '), a.balance != null ? '$' + a.balance : ''].filter(Boolean).join(' · ');
        var info = [el('strong', { text: a.creditor }), el('div', { class: 'sub', text: det }), el('div', { class: 'sub', text: a.issue || '' })];
        if (a.care) info.push(el('div', { class: 'sub warn', text: 'Careful: ' + a.care }));
        list.appendChild(el('label', { class: 'row pick' }, [cb, el('div', {}, info)]));
      });
      results.appendChild(list);
      var save = el('button', { class: 'btn', type: 'button', text: 'Save these accounts' });
      results.appendChild(save);
      save.addEventListener('click', function () {
        save.disabled = true;
        var rows = [];
        d.accounts.forEach(function (a, i) {
          var bs = (a.bureaus && a.bureaus.length) ? a.bureaus : [null];
          bs.forEach(function (b) {
            rows.push({ id: crypto.randomUUID(), org_id: prof.org_id, client_id: clientId, creditor: a.creditor, acct_type: a.acct_type || null,
              acct_last4: a.last4 || null, acct_number: a.acct_number || null, bureau: b, balance: a.balance, decision: boxes[i].checked ? 'dispute' : 'ignore', method: 'ours', reason: a.issue || null });
          });
        });
        sb.from('accounts').insert(rows).then(function (r) {
          if (r.error) { save.disabled = false; status.textContent = 'Could not save the accounts. Please try again.'; return; }
          sb.from('activity_log').insert({ org_id: prof.org_id, actor: user.id, action: 'saved scan results', target: clientId }).then(function () {});
          results.textContent = ''; status.textContent = 'Saved ' + rows.length + ' account lines.'; loadSaved();
        });
      });
    }

    go.addEventListener('click', function () {
      var f = file.files && file.files[0];
      results.textContent = '';
      if (!f) { status.textContent = 'Choose a PDF first.'; return; }
      if (f.type !== 'application/pdf' && !/\.pdf$/i.test(f.name)) { status.textContent = 'That is not a PDF.'; return; }
      if (f.size > MAX_MB * 1024 * 1024) { status.textContent = 'That file is over ' + MAX_MB + ' MB.'; return; }
      go.disabled = true; status.textContent = 'Reading the PDF...';
      extractText(f).then(function (text) {
        if (!text || text.replace(/\s/g, '').length < 200) { go.disabled = false; status.textContent = 'This PDF has no readable text (it may be a picture). Download the report again as a text PDF.'; return; }
        status.textContent = 'Scanning. This can take up to a minute...';
        return sb.functions.invoke('scan-report', { body: { client_id: clientId, text: text } }).then(function (r) {
          go.disabled = false;
          if (r.error) { return errText(r.error).then(function (t) { status.textContent = t; }); }
          status.textContent = 'Scan finished.'; showResults(r.data);
        });
      }).catch(function () { go.disabled = false; status.textContent = 'Could not read that PDF.'; });
    });
  }

  window.NCPReport = { mount: mount };
})();
