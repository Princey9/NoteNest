(function () {
  const demoRoot = document.querySelector('[data-demo-root]');
  const modal = document.querySelector('[data-modal]');

  if (modal) {
    const closeBtn = modal.querySelector('[data-modal-close]');
    const openButtons = document.querySelectorAll('[data-modal-open]');
    const closeModal = () => modal.classList.remove('is-open');

    openButtons.forEach((btn) => {
      btn.addEventListener('click', () => modal.classList.add('is-open'));
    });

    if (closeBtn) {
      closeBtn.addEventListener('click', closeModal);
    }

    modal.addEventListener('click', (event) => {
      if (event.target === modal) {
        closeModal();
      }
    });
  }

  if (!demoRoot) {
    return;
  }

  const fileInput = demoRoot.querySelector('#note-file');
  const textInput = demoRoot.querySelector('#note-text');
  const convertBtn = demoRoot.querySelector('#convert-btn');
  const redactedOutput = demoRoot.querySelector('#redacted-output');
  const jsonOutput = demoRoot.querySelector('#json-output');
  const patientOutput = demoRoot.querySelector('#patient-output');
  const clinicianOutput = demoRoot.querySelector('#clinician-output');
  const statusOutput = demoRoot.querySelector('#status-output');

  const tabButtons = demoRoot.querySelectorAll('[data-tab-button]');
  const tabPanels = demoRoot.querySelectorAll('[data-tab-panel]');

  const setActiveTab = (target) => {
    tabButtons.forEach((btn) => {
      const isActive = btn.dataset.tabButton === target;
      btn.setAttribute('aria-selected', String(isActive));
    });

    tabPanels.forEach((panel) => {
      const isActive = panel.dataset.tabPanel === target;
      panel.hidden = !isActive;
    });
  };

  tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => setActiveTab(btn.dataset.tabButton));
  });

  setActiveTab('patient');

  const redactionRules = [
    {
      key: 'emails',
      regex: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,
      replacement: '[REDACTED_EMAIL]',
    },
    {
      key: 'phones',
      regex: /(?:\+?\d{1,2}\s*)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}/g,
      replacement: '[REDACTED_PHONE]',
    },
    {
      key: 'addresses',
      regex: /\b\d{1,5}\s+[A-Za-z0-9]+(?:\s+[A-Za-z0-9]+){0,3}\s+(?:St|Street|Ave|Avenue|Rd|Road|Ln|Lane|Dr|Drive|Blvd|Boulevard)\b/gi,
      replacement: '[REDACTED_ADDRESS]',
    },
    {
      key: 'names',
      regex: /\b(?:Name|Patient Name|Patient|Pt)\s*:\s*[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2}\b/g,
      replacement: 'Name: [REDACTED_NAME]',
    },
  ];

  const redactText = (text) => {
    const counts = {
      emails: 0,
      phones: 0,
      addresses: 0,
      names: 0,
    };

    let redacted = text;
    redactionRules.forEach((rule) => {
      redacted = redacted.replace(rule.regex, (match) => {
        counts[rule.key] += 1;
        if (rule.key === 'names') {
          return rule.replacement;
        }
        return rule.replacement;
      });
    });

    return { redacted, counts };
  };

  const normalizeList = (items) => {
    const cleaned = items
      .map((item) => item.trim())
      .filter(Boolean);
    return cleaned.length ? cleaned : ['Not found'];
  };

  const extractSections = (text) => {
    const summary = {
      chief_complaint: 'Not found',
      symptoms: [],
      meds: [],
      allergies: [],
      plan: [],
      follow_up: [],
    };

    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    let current = null;

    const setFromHeading = (key, line, headingRegex) => {
      const match = line.match(headingRegex);
      if (match) {
        const rest = line.replace(headingRegex, '').trim();
        if (rest) {
          summary[key].push(rest);
        }
        current = key;
        return true;
      }
      return false;
    };

    for (const line of lines) {
      if (/^(Chief Complaint|CC)[:\-]/i.test(line)) {
        summary.chief_complaint = line.replace(/^(Chief Complaint|CC)[:\-]/i, '').trim() || 'Not found';
        current = null;
        continue;
      }

      if (setFromHeading('symptoms', line, /^(HPI|Symptoms)[:\-]/i)) {
        continue;
      }
      if (setFromHeading('meds', line, /^(Medications|Meds)[:\-]/i)) {
        continue;
      }
      if (setFromHeading('allergies', line, /^Allergies[:\-]/i)) {
        continue;
      }
      if (setFromHeading('plan', line, /^Plan[:\-]/i)) {
        continue;
      }
      if (setFromHeading('follow_up', line, /^(Follow[- ]?Up)[:\-]/i)) {
        continue;
      }

      if (/^[A-Z][A-Z\s]{2,}$/.test(line)) {
        current = null;
        continue;
      }

      if (current) {
        const bullet = line.replace(/^[-*\d.]+\s*/, '').trim();
        if (bullet) {
          summary[current].push(bullet);
        }
      } else if (summary.chief_complaint === 'Not found') {
        if (/pain|fever|cough|shortness of breath|fatigue|nausea|headache/i.test(line)) {
          summary.symptoms.push(line);
        }
      }
    }

    summary.symptoms = normalizeList(summary.symptoms);
    summary.meds = normalizeList(summary.meds);
    summary.allergies = normalizeList(summary.allergies);
    summary.plan = normalizeList(summary.plan);
    summary.follow_up = normalizeList(summary.follow_up);

    return summary;
  };

  const buildPatientView = (summary) => {
    const bullets = [];

    if (summary.chief_complaint !== 'Not found') {
      bullets.push(`Main reason for visit: ${summary.chief_complaint}.`);
    }

    if (summary.symptoms[0] !== 'Not found') {
      bullets.push(`Symptoms noted: ${summary.symptoms.join('; ')}.`);
    }

    if (summary.meds[0] !== 'Not found') {
      bullets.push(`Medications mentioned: ${summary.meds.join(', ')}.`);
    }

    if (summary.allergies[0] !== 'Not found') {
      bullets.push(`Allergies listed: ${summary.allergies.join(', ')}.`);
    }

    if (summary.plan[0] !== 'Not found') {
      bullets.push(`Plan highlights: ${summary.plan.join('; ')}.`);
    }

    if (summary.follow_up[0] !== 'Not found') {
      bullets.push(`Follow-up: ${summary.follow_up.join('; ')}.`);
    }

    while (bullets.length < 5) {
      bullets.push('Ask for a clear next step and who to contact for questions.');
    }

    const questions = [
      'What should I monitor at home?',
      'When should I seek urgent care?',
      'How will we track progress after this visit?',
    ];

    return {
      bullets: bullets.slice(0, 8),
      questions,
    };
  };

  const buildClinicianView = (summary) => {
    const problems = [];
    if (summary.chief_complaint !== 'Not found') {
      problems.push(summary.chief_complaint);
    }
    if (summary.symptoms[0] !== 'Not found') {
      problems.push(...summary.symptoms);
    }

    return {
      problems: normalizeList(problems),
      meds: summary.meds,
      allergies: summary.allergies,
      plan: summary.plan,
      follow_up: summary.follow_up,
    };
  };

  const renderPatientView = (patient) => {
    const bulletLines = patient.bullets.map((item) => `• ${item}`).join('\n');
    const questionLines = patient.questions.map((item) => `• ${item}`).join('\n');

    return `${bulletLines}\n\nQuestions to ask your doctor:\n${questionLines}`;
  };

  const renderClinicianView = (clinician) => {
    const section = (title, items) => {
      const list = items.map((item) => `- ${item}`).join('\n');
      return `${title}\n${list}`;
    };

    return [
      section('Problems', clinician.problems),
      section('Meds', clinician.meds),
      section('Allergies', clinician.allergies),
      section('Plan', clinician.plan),
      section('Follow-up', clinician.follow_up),
    ].join('\n\n');
  };

  const parseInputText = async () => {
    const rawText = textInput.value.trim();
    if (rawText) {
      return rawText;
    }

    if (!fileInput.files.length) {
      throw new Error('Add a note by pasting text or selecting a file.');
    }

    const file = fileInput.files[0];
    const content = await file.text();

    if (file.name.toLowerCase().endsWith('.json')) {
      try {
        const parsed = JSON.parse(content);
        return parsed.note || parsed.text || parsed.content || content;
      } catch (error) {
        return content;
      }
    }

    return content;
  };

  const handleConvert = async () => {
    statusOutput.textContent = '';

    try {
      const inputText = await parseInputText();
      if (!inputText.trim()) {
        throw new Error('Input is empty.');
      }

      const { redacted, counts } = redactText(inputText);
      const summary = extractSections(redacted);
      const patientView = buildPatientView(summary);
      const clinicianView = buildClinicianView(summary);

      redactedOutput.textContent = redacted;
      patientOutput.textContent = renderPatientView(patientView);
      clinicianOutput.textContent = renderClinicianView(clinicianView);
      jsonOutput.textContent = JSON.stringify(summary, null, 2);

      const countSummary = `Redaction counts — emails: ${counts.emails}, phones: ${counts.phones}, addresses: ${counts.addresses}, names: ${counts.names}.`;
      statusOutput.textContent = countSummary;
    } catch (error) {
      statusOutput.textContent = error.message;
    }
  };

  convertBtn.addEventListener('click', handleConvert);
})();
