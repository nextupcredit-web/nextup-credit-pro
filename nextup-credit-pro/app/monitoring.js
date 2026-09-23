/* NextUp Credit Pro - "other monitoring service" logins for one client.
   For clients who are not on sponsored SmartCredit: the agent notes which service the client
   already uses and saves their login so the agent can pull the report directly. Login is
   encrypted with the same key as the client's private details (dob/ssn4). Every reveal is logged. */
(function () {
  function el(tag, attrs, kids) {
    var e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { if (k === 'text') e.textContent = attrs[k]; else e.setAttribute(k, attrs[k]); });
    (kids || []).forEach(function (c) { e.appendChild(c); });
    return e;
  }

  function mount(box, ctx) {
    var sb = ctx.sb, clientId = ctx.clientId, prof = ctx.prof, user = ctx.user;
    var editingId = null; /* non-null while the form below is editing a saved entry instead of adding a new one */

    var svcInput = el('input', { id: 'msvc', type: 'text', maxlength: '80', placeholder: 'e.g. IdentityIQ, myFICO, Credit Karma' });
    var userInput = el('input', { id: 'muser', type: 'text', maxlength: '200', autocomplete: 'off' });
    var passInput = el('input', { id: 'mpass', type: 'password', maxlength: '200', autocomplete: 'off' });
    var showBtn = el('button', { class: 'link', type: 'button', text: 'Show' });
    showBtn.addEventListener('click', function () {
      var hiding = passInput.type === 'text';
      passInput.type = hiding ? 'password' : 'text';
      showBtn.textContent = hiding ? 'Show' : 'Hide';
    });
    var notesInput = el('textarea', { id: 'mnotes', rows: '3', maxlength: '2000', placeholder: 'Security questions, PIN, anything the agent needs to log in.' });
    var saveBtn = el('button', { class: 'btn', type: 'submit', text: 'Save login' });
    var cancelBtn = el('button', { class: 'link', type: 'button', text: 'Cancel edit', hidden: '' });
    cancelBtn.addEventListener('click', function () { resetForm(); });
    var fmsg = el('div', { id: 'mmsg', class: 'msg', role: 'alert' });

    var form = el('form', { id: 'mform', novalidate: '' }, [
      el('label', { for: 'msvc' }, [document.createTextNode('Service the client uses'), svcInput]),
      el('label', { for: 'muser' }, [document.createTextNode('Username / email'), userInput]),
      el('label', { for: 'mpass' }, [document.createTextNode('Password'), passInput, showBtn]),
      el('label', { for: 'mnotes' }, [document.createTextNode('Notes'), notesInput]),
      saveBtn, cancelBtn, fmsg
    ]);
    var savedBox = el('div', { id: 'monlist', class: 'list' });

    box.appendChild(el('h2', { text: 'Other monitoring login' }));
    box.appendChild(el('p', { class: 'sub', text: 'For a client using their own credit monitoring instead of sponsored SmartCredit. Stored encrypted; only revealed on request, and every reveal is recorded in the activity log.' }));
    box.appendChild(form);
    box.appendChild(el('h2', { text: 'Saved logins' }));
    box.appendChild(savedBox);

    function resetForm() {
      editingId = null; form.reset(); passInput.type = 'password'; showBtn.textContent = 'Show';
      saveBtn.textContent = 'Save login'; cancelBtn.hidden = true; fmsg.textContent = '';
    }

    function loadSaved() {
      sb.from('monitoring_creds').select('id,service,updated_at').eq('client_id', clientId).order('updated_at', { ascending: false }).limit(50).then(function (r) {
        savedBox.textContent = '';
        if (r.error) { savedBox.appendChild(el('p', { class: 'sub', text: 'Could not load saved logins.' })); return; }
        if (!r.data.length) { savedBox.appendChild(el('p', { class: 'sub', text: 'No other logins saved yet.' })); return; }
        r.data.forEach(function (m) {
          var revealTimer = null;
          var out = el('div', { class: 'sub' });
          var reveal = el('button', { class: 'link', type: 'button', text: 'Reveal' });
          var editL = el('button', { class: 'link', type: 'button', text: 'Edit', hidden: '' });
          var del = el('button', { class: 'link', type: 'button', text: 'Delete' });
          var revealed = null;
          reveal.addEventListener('click', function () {
            reveal.disabled = true;
            sb.rpc('reveal_monitoring_creds', { mid: m.id }).then(function (r) {
              reveal.disabled = false;
              if (r.error || !r.data || !r.data[0]) { out.textContent = 'Could not reveal.'; return; }
              revealed = r.data[0];
              out.textContent = 'Username: ' + (revealed.username || '-') + '   Password: ' + (revealed.password || '-') + (revealed.notes ? '   Notes: ' + revealed.notes : '') + '   (hides in 30 seconds)';
              editL.hidden = false;
              clearTimeout(revealTimer);
              revealTimer = setTimeout(function () { out.textContent = ''; editL.hidden = true; }, 30000);
            });
          });
          editL.addEventListener('click', function () {
            if (!revealed) return;
            editingId = m.id;
            svcInput.value = m.service || ''; userInput.value = revealed.username || ''; passInput.value = revealed.password || ''; notesInput.value = revealed.notes || '';
            saveBtn.textContent = 'Update login'; cancelBtn.hidden = false; fmsg.textContent = '';
            form.scrollIntoView({ behavior: 'smooth', block: 'start' });
          });
          del.addEventListener('click', function () {
            if (!window.confirm('Delete this saved login? This cannot be undone.')) return;
            del.disabled = true;
            sb.from('monitoring_creds').delete().eq('id', m.id).then(function (r) {
              if (r.error) { del.disabled = false; return; }
              sb.from('activity_log').insert({ org_id: prof.org_id, actor: user.id, action: 'deleted monitoring creds', target: clientId }).then(function () {});
              if (editingId === m.id) resetForm();
              loadSaved();
            });
          });
          savedBox.appendChild(el('div', { class: 'row' }, [
            el('div', {}, [el('strong', { text: m.service || 'Login' }), el('div', { class: 'sub', text: 'Updated ' + new Date(m.updated_at).toLocaleDateString() }), out]),
            el('div', {}, [reveal, editL, del])]));
        });
      });
    }
    loadSaved();

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var svc = svcInput.value.trim(), un = userInput.value.trim(), pw = passInput.value;
      if (!svc || !un || !pw) { fmsg.style.color = ''; fmsg.textContent = 'Enter at least the service, username and password.'; return; }
      saveBtn.disabled = true; fmsg.textContent = '';
      sb.rpc('save_monitoring_creds', { cid: clientId, mid: editingId, svc: svc, uname: un, pwd: pw, nts: notesInput.value.trim() || null }).then(function (r) {
        saveBtn.disabled = false;
        if (r.error) { fmsg.style.color = ''; fmsg.textContent = 'Could not save. Please try again.'; return; }
        fmsg.style.color = '#0a7d3c'; fmsg.textContent = 'Saved and encrypted.';
        resetForm(); loadSaved();
      });
    });
  }

  window.NCPMonitoring = { mount: mount };
})();
