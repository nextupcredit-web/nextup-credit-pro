/* NextUp Credit Pro - Credit Repair Service Agreement e-sign, for one client.
   Fills NextUp's real agreement/POA/CROA-disclosure template with the client's own info,
   captures a typed electronic signature (ESIGN Act), and stores the exact signed text
   encrypted (it contains the client's DOB) - same pattern as dob/ssn4/monitoring creds.
   Every sign and every reveal-for-printing is logged to activity_log. */
(function () {
  var COMPANY_NAME = 'NextUp Enterprise';
  var COMPANY_ADDR = '250 Pierce St #203\nKingston, PA 18704';
  var CANCEL_EMAIL = 'support@nextupenterprise.com';

  function el(tag, attrs, kids) {
    var e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { if (k === 'text') e.textContent = attrs[k]; else e.setAttribute(k, attrs[k]); });
    (kids || []).forEach(function (c) { e.appendChild(c); });
    return e;
  }
  function today() { var d = new Date(); return ('0' + (d.getMonth() + 1)).slice(-2) + '/' + ('0' + d.getDate()).slice(-2) + '/' + d.getFullYear(); }
  function fmtDob(v) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v || ''); return m ? m[2] + '/' + m[3] + '/' + m[1] : (v || ''); }
  function money(v) { var n = Number(v) || 0; var s = n.toFixed(2); if (/\.00$/.test(s)) s = s.slice(0, -3); return '$' + s; }

  function buildBody(f) {
    /* f: {name, addr, dob, date, feeI, feeM, signedName, signedAt, ip} - signedName/signedAt/ip optional (added after signing) */
    var name = f.name || '[client name]', addr = f.addr || '[address on file]', dob = f.dob || '[date of birth on file]';
    var feeI = money(f.feeI), feeM = money(f.feeM);
    var lines = [
      COMPANY_NAME, COMPANY_ADDR,
      'Prepared for:', name, addr, dob, f.date,
      '',
      'The following pages contain:',
      '1. Credit Repair Service Agreement',
      '2. Your journey with Nextup Enterprise',
      '3. Authorization for Credit Repair Action',
      '4. Consumer Credit File Rights (CROA Disclosure)',
      '5. Right Of Cancellation Notice',
      '6. State Specific Disclosures (add if applicable)',
      '',
      '',
      'Credit Repair Service Agreement for ' + name,
      '',
      'I, ' + name + ', hereby enter into the following agreement with ' + COMPANY_NAME + '.',
      '',
      COMPANY_NAME + ' hereby agrees to perform the following:',
      '',
      "1. To evaluate Customer's current credit reports as listed with applicable credit reporting agencies and to identify inaccurate, erroneous, false, or obsolete information. To advise Customer as to the necessary steps to be taken on the part of Customer in conjunction with Our Company, to dispute any inaccurate, erroneous, false or obsolete information contained in the customer's credit reports.",
      '2. To prepare all necessary correspondence in dispute of inaccurate, erroneous, false, or obsolete information in customer\'s credit reports.',
      '3. To review credit profile status from the credit reporting agencies such as: Experian, Equifax and Transunion. Consulting, coaching, and monitoring services are conducted by personal meetings, webinars, video conferencing, telephone, email, or by any other form of communication during normal business hours.',
      '',
      'In exchange, I, ' + name + ', agree to pay the following fees as outlined in the following fee schedule:',
      '',
      '1. Initial Document Processing Fee ' + feeI,
      'A recurring fee of ' + feeM + ' will be charged 30 days after the initial processing fee. This fee covers ongoing services provided under this agreement.',
      '',
      'Your Journey With NextUp Enterprise',
      'I, ' + name + ', understand that my engagement with ' + COMPANY_NAME + ' will follow the process outlined below.',
      'Step 1 — Free Consultation Before signing this Agreement, i ' + name + ' received a free, no-obligation consultation during which ' + COMPANY_NAME + ' reviewed my specific credit situation and confirmed their ability to assist.',
      'Step 2 — By signing this Agreement, i ' + name + ' authorize ' + COMPANY_NAME + ' to begin services as outlined in the Credit Repair Service Agreement above, including the fee schedule stated therein.',
      'Step 3 — Identity Verification & Document Collection i ' + name + ' agree to provide ' + COMPANY_NAME + ' with the documentation required to verify my identity and access my credit reports, including a government-issued ID, proof of address, and credit monitoring access.',
      'Step 4 — Work Begins Once ' + COMPANY_NAME + ' has received the required documentation, ' + COMPANY_NAME + ' will pull and audit ' + name + "'s credit reports, identify items that are inaccurate, outdated, or unverifiable, and prepare and submit disputes to the applicable credit bureaus and/or furnishers.",
      "Step 5 — Ongoing Monthly Service " + name + "'s monthly service fee, as set forth in the fee schedule above, covers " + COMPANY_NAME + "'s continued work on " + name + "'s file, including follow-up on prior disputes, escalation of unresolved items, and submission of new disputes as " + name + "'s credit reports update.",
      'Step 6 — Ongoing Support ' + name + ' will have access to ' + COMPANY_NAME + "'s client portal to track dispute progress, and " + COMPANY_NAME + ' will be available to provide credit-building guidance throughout the course of this Agreement.',
      '',
      '',
      'Authorization for Credit Repair Action',
      '',
      '1. I, ' + name + ', hereafter known as "client" hereby authorize, ' + COMPANY_NAME + ', ' + COMPANY_ADDR.replace('\n', ', ') + ', to make, receive, sign, endorse, execute, acknowledge, deliver, and possess such applications, correspondence, contracts, or agreements, as necessary to improve my credit. Such instruments in writing of whatever and nature shall only be effective for any or all of the three credit reporting agencies which are TransUnion, Experian, Equifax, and any other reporting agencies or creditor’s listed, as may be necessary or proper in the exercise of the rights and powers herein granted.',
      '',
      '2. This authorization may be revoked by the undersigned at any time by giving written notice to the party authorized herein. Any activity made prior to revocation in reliance upon this authorization shall not constitute a breach of rights of the client. If not earlier revoked, this authorization will automatically expire twelve months from the date of signature.',
      '',
      '3. The party named above to receive the information is not authorized to make any further release or disclosure of the information received. This authorization does not authorize the release or disclosure of any information except as provided herein.',
      '',
      '4. I grant to ' + COMPANY_NAME + ', ' + COMPANY_ADDR.replace('\n', ', ') + ', authority to do, take, and perform, all acts and things whatsoever requisite, proper, or necessary to be done, in the exercise of repairing my credit with the three credit reporting agencies, which are TransUnion, Experian, Equifax and any other reporting agencies or creditor’s listed, as fully for all intents and purposes as I might or could do if personally present.',
      '',
      '5. I hereby release ' + COMPANY_NAME + ', ' + COMPANY_ADDR.replace('\n', ', ') + ', from all and all matters of actions, causes of action, suits, proceedings, debts, dues, contracts, judgments, damages, claims, and demands whatsoever in law or equity, for or by reason of any matter, cause, or thing whatsoever as based on the circumstances of this contract.',
      '',
      'Consumer Credit File Rights Under State and Federal Law',
      '',
      'You have a right to dispute inaccurate information in your credit report by contacting the credit bureau directly. However, neither you nor a credit repair company or credit repair organization has the right to have accurate, current and verifiable information removed from your credit report. The credit bureau must remove accurate, negative information from your report only if it is over 7 years old. Bankruptcy information can be reported up to 10 years.',
      '',
      'You have a right to obtain a copy of your credit report from a credit bureau. You may be charged a reasonable fee. There is no fee, however, if you have been turned down for credit, employment, insurance, or a rental dwelling because of information in your credit report within the preceding 60 days. The credit bureau must provide someone to help you interpret the information in your credit file. You are entitled to receive a free copy of your credit report if you are unemployed and intend to apply for employment in the next 60 days, if you are a recipient of public welfare assistance, or if you have reason to believe that there is inaccurate information in your credit report due to fraud.',
      '',
      'You have a right to sue a credit repair organization that violated the Credit Repair Organization Act. This law prohibits deceptive practices by credit repair organizations.',
      '',
      'You have the right to cancel your contract with any credit repair organization for any reason within 3 business days from the date you signed it.',
      '',
      'Credit bureaus are required to follow reasonable procedures to ensure that the information they report is accurate. However, mistakes may occur.',
      '',
      'You may, on your own, notify a credit bureau in writing that you dispute that accuracy of information in your credit file. The credit bureau must then reinvestigate and modify or remove inaccurate or incomplete information. The credit bureau may not charge any fee for this service. Any pertinent information and copies of all documents you have concerning an error should be given to the credit bureau.',
      '',
      "If the credit bureau's reinvestigation does not resolve the dispute to your satisfaction, you may send a brief statement to the credit bureau to be kept in your file, explaining why you think the record is inaccurate. The credit bureau must include a summary of your statement about disputed information with any report it issues about you.",
      '',
      'The Federal Trade Commission regulates credit bureaus and credit repair organizations. For more information contact: The Public Reference Branch Federal Trade Commission Washington, D.C. 20580.',
      'PA Credit Repair Laws: https://govt.westlaw.com/pac/Browse/Home/Pennsylvania/UnofficialPurdonsPennsylvaniaStatutes',
      '',
      '1. Surety Bond / Trust Account Disclosure Clause',
      'Pennsylvania Compliance Disclosure',
      'This Company is operating as a Credit Services Organization under the Pennsylvania Credit Services Act (73 P.S. §2181 et seq.). In accordance with Pennsylvania law, the Company maintains a surety bond and/or trust account as required to protect consumers. Any advance fees collected under this agreement are secured by such bond or trust account. Information regarding the bond or trust account, including the name and address of the financial institution or surety company, is available upon written request.',
      '',
      '2. No Guarantee / No Misrepresentation Clause',
      'No Guarantee of Results',
      "The Client understands that the Company makes no guarantee, representation, or warranty regarding the improvement of the Client's credit profile, credit score, or the removal of any specific item from the Client's credit reports. All services are performed in compliance with applicable federal and state laws, and results may vary depending on the Client's individual circumstances and creditor responses.",
      '',
      '3. Consumer Rights Disclosure Clause',
      'Consumer Acknowledgment of Rights',
      'The Client acknowledges that they have the right to obtain a copy of their credit report from consumer reporting agencies and may dispute inaccurate information on their own without the assistance of a Credit Services Organization. The Client further acknowledges receipt of all disclosures required under the Pennsylvania Credit Services Act prior to execution of this agreement.',
      '',
      'Notice of Right to Cancel',
      '',
      'You may cancel this contract, without any penalty or obligation, at any time before midnight of the 3rd day which begins after the date the contract is signed by you.',
      'To cancel this contract, email ' + CANCEL_EMAIL + ' or deliver a signed, dated copy of this cancellation notice, or any other written notice to ' + COMPANY_NAME + ', ' + COMPANY_ADDR.replace('\n', ', ') + ', before midnight on the 3rd day which begins after the date you have signed this contract stating "I hereby cancel this transaction, (date) (purchaser’s signature)."',
      '',
      'Please acknowledge your receipt of this notice by electronically signing the form indicated below.',
      '',
      'Acknowledgment of Receipt of Notice',
      '',
      'I, ' + name + ', hereby acknowledge with my digital signature, receipt of the Notice of Right to Cancel. I confirm the fact that I agree and understand what I am signing, and acknowledge that I have received a copy of my Consumer Credit File Rights.',
      "*Digital Signatures: In 2000, the U.S. Electronic Signatures in Global and National Commerce (ESIGN) Act established electronic records and signatures as legally binding, having the same legal effects as traditional paper documents and handwritten signatures. Read more at the FTC web site: http://www.ftc.gov/os/2001/06/esign7.htm"
    ];
    if (f.signedName) {
      lines.push('', '---', 'Electronically signed by: ' + f.signedName, 'Signed at: ' + f.signedAt, 'IP address recorded: ' + (f.ip || 'not captured'));
    }
    return lines.join('\n');
  }

  function mount(box, ctx) {
    var sb = ctx.sb, clientId = ctx.clientId, prof = ctx.prof, user = ctx.user;
    var pa = null;

    var feeI = el('input', { id: 'agfi', type: 'number', min: '0', step: '0.01', value: '149' });
    var feeM = el('input', { id: 'agfm', type: 'number', min: '0', step: '0.01', value: '149' });
    var preview = el('div', { id: 'agpreview', class: 'sub' });
    var nameInput = el('input', { id: 'agname', type: 'text', maxlength: '200', placeholder: 'Type full legal name to sign' });
    var ack = el('input', { id: 'agack', type: 'checkbox' });
    var signBtn = el('button', { class: 'btn', type: 'submit', text: 'Sign agreement' });
    var msg = el('div', { id: 'agmsg', class: 'msg', role: 'alert' });
    var savedBox = el('div', { id: 'aglist', class: 'list' });

    function refreshPreview() {
      loadClient().then(function (c) {
        preview.textContent = buildBody({
          name: (c.first_name || '') + ' ' + (c.last_name || ''),
          addr: c.address, dob: '[revealed at signing]', date: today(),
          feeI: feeI.value, feeM: feeM.value
        });
      });
    }
    function loadClient() { return sb.from('clients').select('first_name,last_name,address').eq('id', clientId).maybeSingle().then(function (r) { return r.data || {}; }); }

    var form = el('form', { id: 'agform', novalidate: '' }, [
      el('div', { class: 'grid' }, [
        el('label', { for: 'agfi' }, [document.createTextNode('Initial fee'), feeI]),
        el('label', { for: 'agfm' }, [document.createTextNode('Monthly fee'), feeM])
      ]),
      el('h3', { text: 'Preview' }),
      el('div', { class: 'list' }, [preview]),
      el('label', { for: 'agname' }, [document.createTextNode('Client’s typed signature (full legal name)'), nameInput]),
      el('label', {}, [ack, document.createTextNode(' The client has read this agreement, including the Notice of Right to Cancel, and agrees to its terms.')]),
      signBtn, msg
    ]);

    box.appendChild(el('h2', { text: 'Service Agreement / e-sign' }));
    box.appendChild(el('p', { class: 'sub', text: 'Fills in NextUp’s real client agreement (incl. authorization/POA and CROA disclosures) with this client’s info, birthdate revealed only at the moment of signing. The signed copy is stored encrypted; every reveal for viewing/printing is logged.' }));
    box.appendChild(form);
    box.appendChild(el('h2', { text: 'Signed agreements' }));
    box.appendChild(savedBox);

    feeI.addEventListener('input', refreshPreview);
    feeM.addEventListener('input', refreshPreview);
    refreshPreview();

    function ipAddress() {
      return fetch('https://api.ipify.org?format=json').then(function (r) { return r.json(); }).then(function (j) { return j.ip; }).catch(function () { return null; });
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = nameInput.value.trim();
      if (!name) { msg.style.color = ''; msg.textContent = 'Type the client’s full legal name to sign.'; return; }
      if (!ack.checked) { msg.style.color = ''; msg.textContent = 'The acknowledgment box must be checked before signing.'; return; }
      signBtn.disabled = true; msg.textContent = 'Signing...';
      Promise.all([loadClient(), sb.rpc('reveal_sensitive', { cid: clientId }), ipAddress()]).then(function (rs) {
        var c = rs[0] || {};
        var s = (rs[1] && rs[1].data && rs[1].data[0]) || {};
        var ip = rs[2];
        var signedAt = new Date().toLocaleString();
        var body = buildBody({
          name: name, addr: c.address, dob: s.dob ? ('Date of Birth: ' + fmtDob(s.dob)) : '',
          date: today(), feeI: feeI.value, feeM: feeM.value,
          signedName: name, signedAt: signedAt, ip: ip
        });
        return sb.rpc('sign_agreement', {
          cid: clientId, akind: 'agreement', body: body, sname: name, sip: ip,
          fee_i: Number(feeI.value) || 0, fee_m: Number(feeM.value) || 0
        });
      }).then(function (r) {
        signBtn.disabled = false;
        if (r.error) { msg.style.color = ''; msg.textContent = 'Could not save the signed agreement. Please try again.'; return; }
        msg.style.color = '#0a7d3c'; msg.textContent = 'Signed and saved.';
        nameInput.value = ''; ack.checked = false;
        loadSaved();
      }).catch(function () { signBtn.disabled = false; msg.style.color = ''; msg.textContent = 'Could not save the signed agreement. Please try again.'; });
    });

    function loadSaved() {
      sb.from('agreements').select('id,kind,signed_name,signed_at').eq('client_id', clientId).order('signed_at', { ascending: false }).limit(50).then(function (r) {
        savedBox.textContent = '';
        if (r.error) { savedBox.appendChild(el('p', { class: 'sub', text: 'Could not load signed agreements.' })); return; }
        if (!r.data.length) { savedBox.appendChild(el('p', { class: 'sub', text: 'Nothing signed yet.' })); return; }
        r.data.forEach(function (a) {
          var view = el('button', { class: 'link', type: 'button', text: 'View / Print' });
          view.addEventListener('click', function () { printAgreement(a.id); });
          savedBox.appendChild(el('div', { class: 'row' }, [
            el('div', {}, [el('strong', { text: (a.kind === 'poa' ? 'Power of Attorney' : 'Service Agreement') + ' — ' + (a.signed_name || '') }), el('div', { class: 'sub', text: 'Signed ' + new Date(a.signed_at).toLocaleString() })]),
            view]));
        });
      });
    }
    loadSaved();

    function printAgreement(id) {
      msg.textContent = 'Preparing to print...';
      sb.rpc('reveal_agreement', { aid: id }).then(function (r) {
        msg.textContent = '';
        if (r.error || !r.data) { msg.style.color = ''; msg.textContent = 'Could not open this agreement.'; return; }
        if (pa) pa.remove();
        pa = el('div', { id: 'printarea' }, [el('div', { class: 'blk', text: r.data })]);
        document.body.appendChild(pa);
        var done = function () { if (pa) { pa.remove(); pa = null; } window.removeEventListener('afterprint', done); };
        window.addEventListener('afterprint', done);
        window.print();
      });
    }
  }

  /* print + layout styles (matches the pattern used for dispute letters) */
  var st = document.createElement('style');
  st.textContent = '#printarea{display:none}#printarea .blk{white-space:pre-wrap;margin:0 0 14px}' +
    '@media print{body>*:not(#printarea){display:none!important}#printarea{display:block!important;font:11pt/1.45 Georgia,serif;color:#000;background:#fff;padding:0.5in}body{background:#fff!important}}';
  document.head.appendChild(st);

  window.NCPAgreement = { mount: mount };
})();
