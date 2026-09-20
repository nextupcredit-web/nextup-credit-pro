/* NextUp Credit Pro - letters to anyone other than the three bureaus:
   creditors, collection agencies, pay-for-delete offers, goodwill, attorneys, and one-off letters.
   The agent picks a type and recipient, the AI writes the body (write-letter function) or the agent types their own. */
(function () {
  var KINDS = [
    ['validation_nonmedical', 'Debt validation - collection agency (non-medical)'],
    ['validation_medical', 'Debt validation - collection agency (medical)'],
    ['original_creditor', 'Direct dispute - original creditor'],
    ['late_payment_proof', 'Demand proof of a late payment'],
    ['goodwill', 'Goodwill - remove one late payment'],
    ['pay_for_delete', 'Pay for delete offer'],
    ['no_response_followup', 'Follow-up - no response'],
    ['attorney', 'Letter to an attorney'],
    ['custom', 'One-off letter (write my own or use a prompt)']
  ];
  var LABEL = {}; KINDS.forEach(function (k) { LABEL[k[0]] = k[1]; });
  var HINT = {
    original_creditor: 'Tip: furnishers do not have to treat a direct dispute prepared by a credit repair company as a full dispute. Use the bureau letters as the main path.',
    pay_for_delete: 'Pay for delete: the letter offers payment only after a signed written agreement to delete. Creditors are not required to agree.',
    attorney: 'Type a short prompt below saying what the letter is for.',
    custom: 'Type a short prompt below and press "Write it for me", or just type the whole letter yourself.'
  };

  function el(tag, attrs, kids) {
    var e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { if (k === 'text') e.textContent = attrs[k]; else e.setAttribute(k, attrs[k]); });
    (kids || []).forEach(function (c) { e.appendChild(c); });
    return e;
  }
  function today() { var d = new Date(); return ('0' + (d.getMonth() + 1)).slice(-2) + '/' + ('0' + d.getDate()).slice(-2) + '/' + d.getFullYear(); }
  function fmtDob(v) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v || ''); return m ? m[2] + '/' + m[3] + '/' + m[1] : (v || ''); }
  function field(label, id, input) { input.id = id; return el('label', { for: id }, [document.createTextNode(label), input]); }
  function copyText(t) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(t);
    return Promise.reject();
  }

  function mount(box, ctx) {
    var sb = ctx.sb, clientId = ctx.clientId, prof = ctx.prof, user = ctx.user;
    var status = el('p', { class: 'sub', role: 'status' });
    var kindSel = el('select', {}); KINDS.forEach(function (k) { kindSel.appendChild(el('option', { value: k[0], text: k[1] })); });
    var hint = el('p', { class: 'sub' });
    var acctSel = el('select', {}); acctSel.appendChild(el('option', { value: '', text: 'No specific account' }));
    var rName = el('input', { type: 'text', maxlength: '120', autocomplete: 'off' });
    var rAddr = el('textarea', { rows: '3', maxlength: '300' });
    var rPhone = el('input', { type: 'text', maxlength: '30', autocomplete: 'off' });
    var amount = el('input', { type: 'text', maxlength: '20', placeholder: 'For example 250', autocomplete: 'off' });
    var amountWrap = field('Amount you are offering ($)', 'ol_amt', amount); amountWrap.style.display = 'none';
    var notes = el('textarea', { rows: '3', maxlength: '1500', placeholder: 'Optional: a short prompt or facts for the writer (for example: sent the validation letter on 8/1 and got no reply).' });
    var body = el('textarea', { rows: '16', class: 'letta', 'aria-label': 'Letter text', placeholder: 'The letter appears here. You can also type your own.' });
    var write = el('button', { class: 'btn', type: 'button', text: 'Write it for me' });
    var save = el('button', { class: 'btn', type: 'button', text: 'Save letter' });
    var pr = el('button', { class: 'btn ghost', type: 'button', text: 'Print letter' });
    var env = el('button', { class: 'btn ghost', type: 'button', text: 'Print envelope' });
    var savedBox = el('div', { id: 'savedother', class: 'list' });
    var accts = [];

    box.id = 'othbox';
    box.appendChild(el('h2', { text: 'Other letters' }));
    box.appendChild(el('p', { class: 'sub', text: 'Letters to creditors, collection agencies, attorneys and anyone else. Pick who it goes to, then let the AI write it or write your own.' }));
    box.appendChild(field('Letter type', 'ol_kind', kindSel)); box.appendChild(hint);
    box.appendChild(field('About which account', 'ol_acct', acctSel));
    box.appendChild(field('Send to (name)', 'ol_name', rName));
    box.appendChild(field('Address (also used on the envelope)', 'ol_addr', rAddr));
    box.appendChild(field('Phone (optional)', 'ol_phone', rPhone));
    box.appendChild(amountWrap);
    box.appendChild(field('Prompt for the writer (optional)', 'ol_notes', notes));
    box.appendChild(write); box.appendChild(status); box.appendChild(body);
    box.appendChild(el('div', { class: 'two' }, [save, pr])); box.appendChild(env);
    box.appendChild(el('h2', { text: 'Saved other letters' })); box.appendChild(savedBox);

    function onKind() { amountWrap.style.display = kindSel.value === 'pay_for_delete' ? 'block' : 'none'; hint.textContent = HINT[kindSel.value] || ''; }
    kindSel.addEventListener('change', onKind); onKind();

    sb.from('accounts').select('id,creditor,acct_type,acct_number,acct_last4,creditor_addr,creditor_phone').eq('client_id', clientId).order('created_at', { ascending: true }).limit(300).then(function (r) {
      var seen = {};
      ((r && r.data) || []).forEach(function (a) {
        var key = (a.creditor || '').toUpperCase() + '|' + (a.acct_number || a.acct_last4 || '');
        if (seen[key]) return; seen[key] = 1;
        accts.push(a);
        acctSel.appendChild(el('option', { value: a.id, text: (a.creditor || 'Account') + ' - ' + (a.acct_number || (a.acct_last4 ? 'ending ' + a.acct_last4 : '')) }));
      });
    });
    acctSel.addEventListener('change', function () {
      var a = accts.filter(function (x) { return x.id === acctSel.value; })[0];
      if (!a) return;
      rName.value = a.creditor || ''; rAddr.value = a.creditor_addr || ''; rPhone.value = a.creditor_phone || '';
    });

    function errText(err) {
      if (err && err.context && typeof err.context.json === 'function') return err.context.json().then(function (j) { return (j && j.error) || 'Could not write the letter.'; }, function () { return 'Could not write the letter.'; });
      return Promise.resolve('Could not write the letter. Please try again.');
    }
    write.addEventListener('click', function () {
      write.disabled = true; status.textContent = 'Writing...';
      sb.functions.invoke('write-letter', { body: { client_id: clientId, kind: kindSel.value, account_id: acctSel.value || null, recipient_name: rName.value, notes: notes.value, amount: amount.value } }).then(function (r) {
        write.disabled = false;
        if (r.error) { return errText(r.error).then(function (t) { status.textContent = t; }); }
        body.value = (r.data && r.data.body) || ''; status.textContent = 'Letter ready. Read it, edit if needed, then save or print.';
      }).catch(function () { write.disabled = false; status.textContent = 'Could not write the letter. Please try again.'; });
    });

    function loadSaved() {
      sb.from('letters').select('id,kind,recipient_name,recipient_addr,body,created_at').eq('client_id', clientId).is('bureau', null).order('created_at', { ascending: false }).limit(100).then(function (r) {
        savedBox.textContent = '';
        if (r.error) { savedBox.appendChild(el('p', { class: 'sub', text: 'Could not load letters.' })); return; }
        if (!r.data.length) { savedBox.appendChild(el('p', { class: 'sub', text: 'No other letters saved yet.' })); return; }
        r.data.forEach(function (l) {
          var cp = el('button', { class: 'link', type: 'button', text: 'Copy text' });
          cp.addEventListener('click', function () { copyText(l.body).then(function () { cp.textContent = 'Copied'; setTimeout(function () { cp.textContent = 'Copy text'; }, 1500); }, function () { cp.textContent = 'Copy failed'; }); });
          var p2 = el('button', { class: 'link', type: 'button', text: 'Print' });
          p2.addEventListener('click', function () { printLetter((l.recipient_name ? l.recipient_name + '\n' : '') + (l.recipient_addr || ''), l.body); });
          var e2 = el('button', { class: 'link', type: 'button', text: 'Envelope' });
          e2.addEventListener('click', function () { printEnvelope((l.recipient_name ? l.recipient_name + '\n' : '') + (l.recipient_addr || '')); });
          savedBox.appendChild(el('div', { class: 'row' }, [
            el('div', {}, [el('strong', { text: (l.recipient_name || 'Letter') }), el('div', { class: 'sub', text: (LABEL[l.kind] || 'Letter') + ' · ' + new Date(l.created_at).toLocaleDateString() })]),
            el('div', {}, [cp, p2, e2])]));
        });
      });
    }
    loadSaved();

    save.addEventListener('click', function () {
      if (body.value.trim().length < 20) { status.textContent = 'Write or generate the letter first.'; return; }
      save.disabled = true;
      sb.from('letters').insert({ id: crypto.randomUUID(), org_id: prof.org_id, client_id: clientId, bureau: null, round: null, body: body.value, kind: kindSel.value,
        recipient_name: rName.value.trim() || null, recipient_addr: rAddr.value.trim() || null, recipient_phone: rPhone.value.trim() || null, account_id: acctSel.value || null }).then(function (r) {
        save.disabled = false;
        if (r.error) { status.textContent = 'Could not save that letter.'; return; }
        sb.from('activity_log').insert({ org_id: prof.org_id, actor: user.id, action: 'saved letter', target: clientId }).then(function () {});
        status.textContent = 'Saved.'; loadSaved();
      });
    });

    /* ---------- printing ---------- */
    function clearPrint() { var o = document.getElementById('printarea'); if (o) o.remove(); }
    function showPrint(node) {
      clearPrint(); document.body.appendChild(node);
      var done = function () { node.remove(); window.removeEventListener('afterprint', done); };
      window.addEventListener('afterprint', done);
      window.print();
    }
    function getClient() {
      return Promise.all([
        sb.from('clients').select('first_name,last_name,address').eq('id', clientId).maybeSingle(),
        sb.rpc('reveal_sensitive', { cid: clientId })
      ]).then(function (rs) { return { c: (rs[0] && rs[0].data) || {}, s: (rs[1] && rs[1].data && rs[1].data[0]) || {}, dob: 1 }; });
    }
    function printLetter(to, text) {
      status.textContent = 'Preparing to print...';
      getClient().then(function (x) {
        var c = x.c, s = x.s, name = (c.first_name || '') + ' ' + (c.last_name || '');
        var head = [name, c.address || '[address missing]'];
        if (s.dob) head.push('Date of Birth: ' + fmtDob(s.dob));
        if (s.ssn4) head.push('SS#: ' + s.ssn4);
        var pa = el('div', { id: 'printarea' }, [
          el('div', { class: 'blk', text: head.join('\n') }), el('div', { class: 'blk', text: to || '[recipient address]' }),
          el('p', { text: today() }), el('div', { class: 'blk', text: text }),
          el('p', { text: 'Sincerely,' }), el('div', { class: 'sigline' }), el('div', { class: 'cap', text: name })]);
        sb.from('activity_log').insert({ org_id: prof.org_id, actor: user.id, action: 'printed letter', target: clientId }).then(function () {});
        status.textContent = ''; showPrint(pa);
      }).catch(function () { status.textContent = 'Could not prepare the letter.'; });
    }
    function printEnvelope(toText) {
      status.textContent = 'Preparing envelope...';
      sb.from('clients').select('first_name,last_name,address').eq('id', clientId).maybeSingle().then(function (r) {
        var c = (r && r.data) || {};
        var pa = el('div', { id: 'printarea', class: 'env' }, [
          el('div', { class: 'from', text: ((c.first_name || '') + ' ' + (c.last_name || '')).trim() + '\n' + (c.address || '') }),
          el('div', { class: 'to', text: toText || '[recipient address]' })]);
        status.textContent = ''; showPrint(pa);
      }).catch(function () { status.textContent = 'Could not prepare the envelope.'; });
    }
    pr.addEventListener('click', function () { printLetter((rName.value.trim() ? rName.value.trim() + '\n' : '') + rAddr.value.trim(), body.value); });
    env.addEventListener('click', function () { printEnvelope((rName.value.trim() ? rName.value.trim() + '\n' : '') + rAddr.value.trim()); });
  }

  var st = document.createElement('style');
  st.textContent = '#othbox textarea{display:block;width:100%;margin:6px 0 10px;padding:12px;font:16px system-ui,sans-serif;border:1px solid #c9d2e3;border-radius:10px;box-sizing:border-box}#othbox .letta{font-size:15px}@page env{size:9.5in 4.125in;margin:0}#printarea.env .from,#printarea.env .to{white-space:pre-wrap}' +
    '@media print{#printarea.env{page:env;position:relative;width:9.5in;height:4.125in;padding:0.4in;box-sizing:border-box}#printarea.env .from{font-size:11pt}#printarea.env .to{position:absolute;left:3.7in;top:1.7in;font-size:14pt;line-height:1.35}}';
  document.head.appendChild(st);
  window.NCPOutbound = { mount: mount };
})();
