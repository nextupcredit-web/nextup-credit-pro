      f.querySelector('#fn').value = c.first_name || ''; f.querySelector('#ln').value = c.last_name || '';
      f.querySelector('#ce').value = c.email || ''; f.querySelector('#cp').value = c.phone || ''; f.querySelector('#ca').value = c.address || '';
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        var fn = $('fn').value.trim(), ln = $('ln').value.trim(), em = $('ce').value.trim();
        if (!fn || !ln) { msg('Please fill in the first and last name.'); return; }
        if (em && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { msg('That email does not look right.'); return; }
        var b = f.querySelector('button'); b.disabled = true; msg('');
        sb.from('clients').update({ first_name: fn, last_name: ln, email: em || null, phone: $('cp').value.trim() || null, address: $('ca').value.trim() || null, stage: $('stg').value }).eq('id', id).then(function (r) {
          b.disabled = false;
          if (r.error) { msg('Could not save. Please try again.'); return; }
          sb.from('activity_log').insert({ org_id: prof.org_id, actor: user.id, action: 'updated client', target: id }).then(function () {});
          msg('Saved.'); $('msg').style.color = '#0a7d3c'; h1.textContent = fn + ' ' + ln;
        });
      });

      /* private details: encrypted, hidden until revealed (each reveal is logged) */
      var out = el('p', { class: 'sub', text: 'Hidden. Click Reveal to see the birthdate and SSN last 4.' });
      var rev = el('button', { class: 'btn ghost', type: 'button', text: 'Reveal' });
      rev.addEventListener('click', function () {
        rev.disabled = true;
        sb.rpc('reveal_sensitive', { cid: id }).then(function (r) {
          rev.disabled = false;
          if (r.error) { out.textContent = 'Could not reveal.'; return; }
          var row = (r.data && r.data[0]) || {};
          if (!row.dob && !row.ssn4) { out.textContent = 'Nothing saved yet.'; return; }
          out.textContent = 'Birthdate: ' + (row.dob || '-') + '   SSN last 4: ' + (row.ssn4 || '-') + '   (hides in 30 seconds)';
          clearTimeout(revealTimer);
          revealTimer = setTimeout(function () { out.textContent = 'Hidden. Click Reveal to see the birthdate and SSN last 4.'; }, 30000);
        });
      });
      var sf = el('form', { id: 'sf', novalidate: '', class: 'grid' }, [
        field('bd', 'Birthdate', 'date', {}), field('s4', 'SSN last 4 digits', 'password', { inputmode: 'numeric', maxlength: '4', pattern: '[0-9]*', autocomplete: 'off' }),
        el('button', { class: 'btn', type: 'submit', text: 'Save private details' }),
        el('div', { id: 'smsg', class: 'msg', role: 'alert' })
      ]);
      sf.addEventListener('submit', function (e) {
        e.preventDefault();
        var d = $('bd').value, s4 = $('s4').value.trim(), sm = $('smsg');
        if (!d || !/^\d{4}$/.test(s4)) { sm.style.color = ''; sm.textContent = 'Enter the birthdate and exactly 4 digits. Saving replaces both.'; return; }
        var b = sf.querySelector('button'); b.disabled = true;
        sb.rpc('set_sensitive', { cid: id, dob: d, ssn4: s4 }).then(function (r) {
          b.disabled = false;
          if (r.error) { sm.style.color = ''; sm.textContent = 'Could not save.'; return; }
          $('s4').value = ''; sm.style.color = '#0a7d3c'; sm.textContent = 'Saved and encrypted.';
        });
      });

      var h1 = el('h1', { text: (c.first_name || '') + ' ' + (c.last_name || '') });
      show([el('div', { class: 'bar' }, [backBtn(), signOutBtn(true)]), h1, f,
        el('h2', { text: 'Private details' }),
        el('p', { class: 'sub', text: 'Stored encrypted. Only revealed on request, and every reveal is recorded in the activity log.' }), out, rev, sf]);
    }
  }

  function signOutBtn(link) {
    var b = el('button', { class: link ? 'link' : 'btn ghost', type: 'button', text: 'Sign out' });
    b.addEventListener('click', function () { sb.auth.signOut().then(loginScreen); });
    return b;
  }
  function fail() { show(head('Something went wrong', 'Please sign in again.').concat([signOutBtn()])); }

  /* ---------- start ---------- */
  sb.auth.getSession().then(function (s) {
    if (s.data && s.data.session) afterPassword(); else loginScreen();
  }).catch(loginScreen);
})();
