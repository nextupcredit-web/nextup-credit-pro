/* NextUp Credit Pro - dispute letters for one client.
   The AI writes one short paragraph per disputed account (draft-letters function, rule-checked there).
   This file assembles one letter per bureau, lets the agent edit it, saves it, and prints it. */
(function () {
  var BUREAU = {
    EQ: { name: 'Equifax', addr: 'Equifax Information Services LLC\nP.O. Box 740256\nAtlanta, GA 30374-0256' },
    EX: { name: 'Experian', addr: 'Experian\nP.O. Box 4500\nAllen, TX 75013' },
    TU: { name: 'TransUnion', addr: 'TransUnion LLC Consumer Dispute Center\nPO Box 2000\nChester, PA 19016\nAttn: Customer Relations Department' }
  };
  var ORDER = ['EQ', 'EX', 'TU'];

  function el(tag, attrs, kids) {
    var e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { if (k === 'text') e.textContent = attrs[k]; else e.setAttribute(k, attrs[k]); });
    (kids || []).forEach(function (c) { e.appendChild(c); });
    return e;
  }
  function today() { var d = new Date(); return ('0' + (d.getMonth() + 1)).slice(-2) + '/' + ('0' + d.getDate()).slice(-2) + '/' + d.getFullYear(); }
  function fmtDob(v) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v || ''); return m ? m[2] + '/' + m[3] + '/' + m[1] : (v || ''); }
  function copyText(t) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(t).catch(function () { return legacy(t); });
    return legacy(t);
  }
  function legacy(t) {
    return new Promise(function (res, rej) {
      var ta = document.createElement('textarea'); ta.value = t; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy') ? res() : rej(); } catch (e) { rej(e); } document.body.removeChild(ta);
    });
  }

  /* wording around the AI paragraphs, by round */
  var R1_INTRO = [
    'I am writing to {B} about the accounts listed below. I need you to confirm that each one belongs to me and is being reported correctly.',
    'Please check the accounts below on my {B} credit file. I want to know that each account is mine and that everything shown for it is accurate.',
    'This letter asks {B} to verify the accounts listed below. Please confirm that they are mine and that the information reported for them is correct.',
    'I have reviewed my {B} credit report and would like the following accounts verified. Please confirm they belong to me and are reporting accurately.',
    'I am asking {B} to look closely at the accounts below. I need to know that each one is really mine and that it is reported accurately on my file.',
    'Please verify the accounts listed below that appear on my {B} report. I want confirmation that they are mine and that the details are accurate.'];
  var R1_CLOSE = [
    'If any of these accounts cannot be verified as mine and accurate, please delete them from my file and send me the written results along with an updated copy of my report.',
    'Please remove any account you cannot confirm is mine and correct, and mail me the results of your check and my updated report.',
    'I expect a written response. Anything you cannot verify as belonging to me and reporting accurately should be deleted, and I would like a copy of my updated credit report.',
    'Please send me your findings in writing. If an account is not mine or cannot be verified as accurate, delete it and send me a new copy of my report.',
    'Please let me know the results in writing, delete whatever cannot be verified, and include an updated copy of my report.',
    'After your check, send me the results in writing. Any account that is not mine or not accurate should be removed, and I would like an updated report.'];
  function pick(list, seed, salt) {
    var h = 7; var t = seed + '|' + salt;
    for (var i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) >>> 0;
    return list[h % list.length];
  }
  function intro(round, bureauName, n, seed) {
    var many = n > 1;
    if (round <= 1) return pick(R1_INTRO, seed, 'i').replace('{B}', bureauName);
    if (round === 2) return 'I asked ' + bureauName + ' to look into the ' + (many ? 'items' : 'item') + ' below and ' + (many ? 'they still appear' : 'it still appears') + ' on my report. Please investigate again and correct or delete anything that is not accurate and complete.';
    return 'This is a further request to ' + bureauName + ' about the ' + (many ? 'items' : 'item') + ' below, which I have raised before.';
  }
  function closing(round, seed) {
    if (round <= 1) return pick(R1_CLOSE, seed, 'c');
    if (round === 2) return 'Please send me the written results of your investigation and an updated copy of my report.';
    return 'For each account above, please send me a description of how it was checked, including the name, address and phone number of the furnisher you contacted and the records you relied on. If any entry cannot be shown to be accurate and complete, please delete it or correct it and send me an updated copy of my report.';
  }

  function mount(box, ctx) {
    var sb = ctx.sb, clientId = ctx.clientId, prof = ctx.prof, user = ctx.user;
    var status = el('p', { class: 'sub', role: 'status' });
    var drafts = el('div', { id: 'drafts' });
    var savedBox = el('div', { id: 'savedletters', class: 'list' });
    var roundSel = el('select', { id: 'rnd', 'aria-label': 'Round' });
    for (var i = 1; i <= 12; i++) roundSel.appendChild(el('option', { value: String(i), text: 'Round ' + i }));
    var go = el('button', { class: 'btn', type: 'button', text: 'Write letters for accounts marked Dispute' });

    box.appendChild(el('h2', { text: 'Letters' }));
    box.appendChild(el('p', { class: 'sub', text: 'One letter per bureau. Round 1 lists the accounts only. From Round 2 the AI writes a fresh paragraph for each account (checked against your rules). You can edit before saving or printing.' }));
    box.appendChild(el('label', { for: 'rnd' }, [document.createTextNode('Round'), roundSel]));
    box.appendChild(go); box.appendChild(status); box.appendChild(drafts);
    box.appendChild(el('h2', { text: 'Saved letters' })); box.appendChild(savedBox);

    /* ---------- print ---------- */
    var pa = null;
    function printLetter(bureauCode, body) {
      status.textContent = 'Preparing to print...';
      Promise.all([
        sb.from('clients').select('first_name,last_name,address').eq('id', clientId).maybeSingle(),
        sb.rpc('reveal_sensitive', { cid: clientId })
      ]).then(function (rs) {
        var c = (rs[0] && rs[0].data) || {}, s = (rs[1] && rs[1].data && rs[1].data[0]) || {};
        var head = [(c.first_name || '') + ' ' + (c.last_name || ''), c.address || '[address missing]'];
        if (s.dob) head.push('Date of Birth: ' + fmtDob(s.dob));
        if (s.ssn4) head.push('SS#: ' + s.ssn4);
        if (pa) pa.remove();
        pa = el('div', { id: 'printarea' }, [
          el('div', { class: 'blk', text: head.join('\n') }), el('div', { class: 'blk', text: BUREAU[bureauCode].addr }),
          el('p', { text: today() }), el('div', { class: 'blk', text: body }),
          el('p', { text: 'Sincerely,' }), el('div', { class: 'sigline' }), el('div', { class: 'cap', text: (c.first_name || '') + ' ' + (c.last_name || '') })]);
        document.body.appendChild(pa);
        sb.from('activity_log').insert({ org_id: prof.org_id, actor: user.id, action: 'printed letter', target: clientId }).then(function () {});
        status.textContent = '';
        var done = function () { if (pa) { pa.remove(); pa = null; } window.removeEventListener('afterprint', done); };
        window.addEventListener('afterprint', done);
        window.print();
      }).catch(function () { status.textContent = 'Could not prepare the letter.'; });
    }

    /* ---------- saved list ---------- */
    function loadSaved() {
      sb.from('letters').select('id,bureau,round,body,created_at').eq('client_id', clientId).order('created_at', { ascending: false }).limit(100).then(function (r) {
        savedBox.textContent = '';
        if (r.error) { savedBox.appendChild(el('p', { class: 'sub', text: 'Could not load letters.' })); return; }
        if (!r.data.length) { savedBox.appendChild(el('p', { class: 'sub', text: 'No letters saved yet.' })); return; }
        r.data.forEach(function (l) {
          var b = BUREAU[l.bureau] || { name: l.bureau || 'Letter' };
          var cp = el('button', { class: 'link', type: 'button', text: 'Copy text' });
          cp.addEventListener('click', function () { copyText(l.body).then(function () { cp.textContent = 'Copied'; setTimeout(function () { cp.textContent = 'Copy text'; }, 1500); }, function () { cp.textContent = 'Copy failed'; }); });
          var pr = el('button', { class: 'link', type: 'button', text: 'Print' });
          pr.addEventListener('click', function () { printLetter(l.bureau, l.body); });
          savedBox.appendChild(el('div', { class: 'row' }, [
            el('div', {}, [el('strong', { text: b.name + ' · Round ' + (l.round || 1) }), el('div', { class: 'sub', text: new Date(l.created_at).toLocaleDateString() })]),
            el('div', {}, [cp, pr])]));
        });
      });
    }
    loadSaved();

    /* ---------- write letters ---------- */
    function errText(err) {
      if (err && err.context && typeof err.context.json === 'function') return err.context.json().then(function (j) { return (j && j.error) || 'Could not write the letters.'; }, function () { return 'Could not write the letters.'; });
      return Promise.resolve('Could not write the letters. Please try again.');
    }

    go.addEventListener('click', function () {
      var round = parseInt(roundSel.value, 10) || 1;
      drafts.textContent = ''; go.disabled = true; status.textContent = 'Writing. This takes a few seconds per account...';
      Promise.all([
        sb.functions.invoke('draft-letters', { body: { client_id: clientId, round: round } }),
                sb.from('accounts').select('id,creditor,acct_type,acct_last4,acct_number,bureau').eq('client_id', clientId).eq('decision', 'dispute')
      ]).then(function (rs) {
        go.disabled = false;
        var fr = rs[0], ar = rs[1];
        if (fr.error) { return errText(fr.error).then(function (t) { status.textContent = t; }); }
        var info = {}; ((ar && ar.data) || []).forEach(function (a) { info[a.id] = a; });
        var dups = 0;
        var by = {}; ((fr.data && fr.data.items) || []).forEach(function (it) {
          if (it.dup_of) { dups++; return; }
          var a = info[it.account_id]; if (!a || !BUREAU[a.bureau]) return;
          (by[a.bureau] = by[a.bureau] || []).push({ a: a, text: it.text, review: round > 1 && !it.text });
        });
        var codes = ORDER.filter(function (k) { return by[k] && by[k].length; });
        if (!codes.length) { status.textContent = 'No accounts marked Dispute with a bureau. Mark some above first.'; return; }
        var anyReview = false;
        status.textContent = 'Letters ready. Read them, edit if needed, then save or print.' + (dups ? ' Left out ' + dups + ' duplicate account line' + (dups > 1 ? 's' : '') + '.' : '');
        codes.forEach(function (k) {
          var list = by[k], seed = clientId + k, parts = [intro(round, BUREAU[k].name, list.length, seed), ''];
          list.forEach(function (x, n) {
            if (x.review) anyReview = true;
                        parts.push((n + 1) + '. ' + x.a.creditor + ', ' + (x.a.acct_type || 'account') + (x.a.acct_number ? ', account number ' + x.a.acct_number : (x.a.acct_last4 ? ', account ending ' + x.a.acct_last4 : '')));
            if (round > 1) parts.push(x.review ? '[The writer could not draft this one. Type the reason here.]' : x.text);
            parts.push('');
          });
          parts.push(closing(round, seed));
          var ta = el('textarea', { rows: '16', 'aria-label': BUREAU[k].name + ' letter', class: 'letta' }); ta.value = parts.join('\n');
          var save = el('button', { class: 'btn', type: 'button', text: 'Save ' + BUREAU[k].name + ' letter' });
          var pr = el('button', { class: 'btn ghost', type: 'button', text: 'Print' });
          save.addEventListener('click', function () {
            save.disabled = true;
            sb.from('letters').insert({ id: crypto.randomUUID(), org_id: prof.org_id, client_id: clientId, bureau: k, round: round, body: ta.value }).then(function (r) {
              save.disabled = false;
              if (r.error) { status.textContent = 'Could not save that letter.'; return; }
              sb.from('activity_log').insert({ org_id: prof.org_id, actor: user.id, action: 'saved letter', target: clientId }).then(function () {});
              save.textContent = 'Saved'; loadSaved();
            });
          });
          pr.addEventListener('click', function () { printLetter(k, ta.value); });
          drafts.appendChild(el('div', { class: 'draft' }, [el('h2', { text: BUREAU[k].name }), ta, el('div', { class: 'two' }, [save, pr])]));
        });
        if (anyReview) status.textContent += ' Some accounts need you to type the reason yourself.';
      }).catch(function () { go.disabled = false; status.textContent = 'Could not write the letters. Please try again.'; });
    });
  }

  /* print + layout styles */
  var st = document.createElement('style');
  st.textContent = '.letta{width:100%;box-sizing:border-box;padding:12px;font:15px/1.5 system-ui,sans-serif;border:1px solid #c9d2e3;border-radius:10px;margin:8px 0;resize:vertical}.two{display:grid;grid-template-columns:1fr 1fr;gap:10px}.draft{margin-top:8px}' +
    '#printarea{display:none}#printarea .blk{white-space:pre-wrap;margin:0 0 14px}#printarea .sigline{border-bottom:1px solid #000;width:260px;margin:34px 0 4px}' +
    '@media print{body>*:not(#printarea){display:none!important}#printarea{display:block!important;font:12pt/1.45 Georgia,serif;color:#000;background:#fff;padding:0.5in}body{background:#fff!important}}';
  document.head.appendChild(st);

  window.NCPLetters = { mount: mount };
})();
