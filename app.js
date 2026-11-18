const MAX_WORKS = 10;
const input = document.querySelector('#pdf-input');
const form = document.querySelector('#metadata-form');
const uploadPanel = document.querySelector('#upload-panel');
const successPanel = document.querySelector('#success-panel');
const chooseButton = document.querySelector('#choose-file');
const changeButton = document.querySelector('#change-file');
const cancelButton = document.querySelector('#cancel-button');
const newWorkButton = document.querySelector('#new-work');
const saveButton = document.querySelector('#save-button');
const downloadButton = document.querySelector('#download-works');
const errorBox = document.querySelector('#form-error');
const selectedName = document.querySelector('#selected-name');
const selectedSize = document.querySelector('#selected-size');
const docType = document.querySelector('#docType');
const titleLabel = document.querySelector('#title-label');
const journalLabel = document.querySelector('#journal-label');
const worksList = document.querySelector('#works-list');
const queueCount = document.querySelector('#queue-count');
let selectedFile = null;
let works = [];

const visibleFields = {
  Livro: ['subtitle', 'language', 'publisher', 'city', 'edition', 'series', 'isbn', 'translator'],
  'Artigo de Periódico': ['language', 'journal', 'issn', 'volume', 'issue', 'pages', 'doi', 'url'],
  'Capítulo de Livro': ['language', 'journal', 'publisher', 'city', 'edition', 'series', 'pages', 'doi'],
  'Tese/Dissertação': ['language', 'publisher', 'city', 'institution', 'pages', 'doi', 'translator', 'url'],
  'Conferência': ['language', 'journal', 'city', 'volume', 'issue', 'pages', 'doi', 'url'],
  'Artigo de Revista': ['language', 'journal', 'volume', 'issue', 'pages', 'url'],
  'Artigo de Jornal': ['language', 'journal', 'pages', 'url'],
  'Relatório Técnico': ['language', 'publisher', 'city', 'institution', 'pages', 'doi', 'url'],
  'Verbete de Enciclopédia': ['language', 'journal', 'publisher', 'city', 'edition', 'volume', 'pages', 'doi'],
  'Página da Web': ['language', 'journal', 'url'],
  'Legislação / Estatuto': ['language', 'journal', 'city', 'pages', 'url'],
  'Jurisprudência': ['language', 'journal', 'city', 'pages', 'url'],
  'Não especificado': ['language', 'journal', 'publisher', 'city', 'pages', 'doi', 'url'],
};

function formatSize(bytes) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function safeFilename(value, fallback = 'Obra cadastrada') {
  const cleaned = String(value || '')
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/[. ]+$/, '')
    .trim()
    .slice(0, 150)
    .replace(/[. ]+$/, '');
  return cleaned || fallback;
}

function setStep(active) {
  ['file', 'data', 'ready'].forEach((step, index) => {
    const element = document.querySelector(`#step-${step}`);
    element.classList.toggle('active', index === active);
    element.classList.toggle('complete', index < active);
  });
}

function setFieldsForType() {
  const visible = new Set(visibleFields[docType.value] || []);
  document.querySelectorAll('[data-field]').forEach(field => {
    field.hidden = !visible.has(field.dataset.field);
    field.querySelectorAll('input, textarea, select').forEach(control => {
      control.disabled = field.hidden;
    });
  });
  const titleLabels = {
    Livro: 'Título do livro *',
    'Capítulo de Livro': 'Título do capítulo *',
    'Tese/Dissertação': 'Título do trabalho *',
    'Página da Web': 'Título da página *',
    'Legislação / Estatuto': 'Nome da norma *',
    'Jurisprudência': 'Identificação do julgamento *',
  };
  titleLabel.textContent = titleLabels[docType.value] || 'Título da obra *';
  journalLabel.textContent = docType.value === 'Capítulo de Livro' ? 'Título do livro' : 'Publicação / periódico de origem';
}

function resetForm() {
  selectedFile = null;
  input.value = '';
  form.reset();
  form.hidden = true;
  uploadPanel.hidden = false;
  successPanel.hidden = true;
  errorBox.hidden = true;
  saveButton.disabled = false;
  saveButton.classList.remove('is-loading');
  setStep(0);
  setFieldsForType();
  updateQueueUI();
}

function showLimitMessage() {
  errorBox.textContent = 'A fila atingiu 10 obras. Baixe o ZIP antes de anexar novos arquivos.';
  errorBox.hidden = false;
  worksList.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function selectFile(file) {
  if (!file) return;
  if (works.length >= MAX_WORKS) {
    input.value = '';
    showLimitMessage();
    return;
  }
  if (!file.name.toLowerCase().endsWith('.pdf') || file.type && file.type !== 'application/pdf') {
    alert('Selecione um arquivo no formato PDF.');
    input.value = '';
    return;
  }
  if (file.size > 500 * 1024 * 1024) {
    alert('O PDF selecionado excede o limite de 500 MB.');
    input.value = '';
    return;
  }

  selectedFile = file;
  selectedName.textContent = file.name;
  selectedSize.textContent = formatSize(file.size);
  form.elements.title.value = file.name.replace(/\.pdf$/i, '').replace(/[._-]+/g, ' ');
  uploadPanel.hidden = true;
  successPanel.hidden = true;
  form.hidden = false;
  errorBox.hidden = true;
  setStep(1);
  setFieldsForType();
  form.elements.title.focus();
}

function collectMetadata() {
  const data = new FormData(form);
  return {
    originalFilename: selectedFile.name,
    title: String(data.get('title') || '').trim(),
    subtitle: String(data.get('subtitle') || '').trim(),
    series: String(data.get('series') || '').trim(),
    authors: String(data.get('authors') || '').trim(),
    publicationYear: Number(data.get('publicationYear')),
    docType: String(data.get('docType') || ''),
    journal: String(data.get('journal') || '').trim(),
    volume: String(data.get('volume') || '').trim(),
    issue: String(data.get('issue') || '').trim(),
    pages: String(data.get('pages') || '').trim(),
    doi: String(data.get('doi') || '').trim(),
    url: String(data.get('url') || '').trim(),
    abstract: String(data.get('abstract') || '').trim(),
    tags: String(data.get('tags') || '').split(',').map(item => item.trim()).filter(Boolean),
    collection: String(data.get('collection') || '').trim() || 'Geral',
    publisher: String(data.get('publisher') || '').trim(),
    city: String(data.get('city') || '').trim(),
    edition: String(data.get('edition') || '').trim(),
    isbn: String(data.get('isbn') || '').trim(),
    issn: String(data.get('issn') || '').trim(),
    institution: String(data.get('institution') || '').trim(),
    language: String(data.get('language') || '').trim(),
    translator: String(data.get('translator') || '').trim(),
    notes: String(data.get('notes') || '').trim(),
  };
}

function getAvailableFilename(metadata) {
  const authorStem = safeFilename(metadata.authors.split(';')[0].trim(), 'Obra');
  const baseStem = safeFilename(`${authorStem} - ${metadata.title}`);
  const usedNames = new Set(works.map(work => work.pdfFilename));
  let stem = baseStem;
  let suffix = 2;
  while (usedNames.has(`${stem}.pdf`)) {
    stem = `${baseStem} (${suffix})`;
    suffix += 1;
  }
  return { stem, pdfFilename: `${stem}.pdf`, metadataFilename: `${stem}.citame.json` };
}

async function createSidecar(metadata, filenames) {
  const header = new Uint8Array(await selectedFile.slice(0, 5).arrayBuffer());
  if (String.fromCharCode(...header) !== '%PDF-') {
    throw new Error('O arquivo selecionado não é um PDF válido.');
  }

  const timestamp = new Date().toISOString();
  const dateAdded = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date());
  const reference = {
    id: `ref-cadastrar-${crypto.randomUUID()}`,
    title: metadata.title,
    subtitle: metadata.subtitle || undefined,
    series: metadata.series || undefined,
    authors: metadata.authors,
    publicationYear: metadata.publicationYear,
    journal: metadata.journal,
    volume: metadata.volume,
    issue: metadata.issue,
    pages: metadata.pages,
    doi: metadata.doi,
    url: metadata.url,
    abstract: metadata.abstract,
    tags: metadata.tags,
    collection: metadata.collection,
    docType: metadata.docType,
    publisher: metadata.publisher,
    city: metadata.city,
    edition: metadata.edition,
    isbn: metadata.isbn,
    issn: metadata.issn,
    institution: metadata.institution,
    language: metadata.language,
    translator: metadata.translator,
    notes: metadata.notes,
    filename: filenames.pdfFilename,
    fileSize: formatSize(selectedFile.size),
    isRead: false,
    isFavorite: false,
    dateAdded,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  return {
    schemaVersion: 1,
    application: 'Citame',
    storedAt: timestamp,
    attachment: {
      filename: filenames.pdfFilename,
      originalFilename: selectedFile.name,
      contentType: 'application/pdf',
      fileSize: selectedFile.size,
    },
    reference,
    annotations: [],
    textAnnotations: [],
  };
}

async function saveWork(event) {
  event.preventDefault();
  if (!selectedFile) {
    resetForm();
    return;
  }
  if (works.length >= MAX_WORKS) {
    showLimitMessage();
    return;
  }

  errorBox.hidden = true;
  saveButton.disabled = true;
  saveButton.classList.add('is-loading');
  try {
    const metadata = collectMetadata();
    const filenames = getAvailableFilename(metadata);
    const sidecar = await createSidecar(metadata, filenames);
    works.push({
      ...filenames,
      id: sidecar.reference.id,
      title: metadata.title,
      authors: metadata.authors,
      docType: metadata.docType,
      file: selectedFile,
      sidecar,
      fileSize: selectedFile.size,
      storedAt: sidecar.storedAt,
    });
    document.querySelector('#result-pdf').textContent = filenames.pdfFilename;
    document.querySelector('#result-json').textContent = filenames.metadataFilename;
    document.querySelector('#result-count').textContent = String(works.length);
    form.hidden = true;
    successPanel.hidden = false;
    setStep(2);
    updateQueueUI();
  } catch (error) {
    errorBox.textContent = error.message || 'Não foi possível preparar a obra.';
    errorBox.hidden = false;
  } finally {
    saveButton.disabled = false;
    saveButton.classList.remove('is-loading');
  }
}

function escapeText(value) {
  return String(value || '').replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  })[character]);
}

function displayType(type) {
  return type === 'Tese/Dissertação' ? 'Tese / Dissertação' : type;
}

function updateQueueUI() {
  const count = works.length;
  const totalBytes = works.reduce((total, work) => total + work.fileSize, 0);
  const atLimit = count >= MAX_WORKS;
  queueCount.textContent = `${count} de ${MAX_WORKS}`;
  chooseButton.disabled = atLimit;
  newWorkButton.disabled = atLimit;
  newWorkButton.textContent = atLimit ? 'Limite atingido — baixe o ZIP' : 'Adicionar outra obra';
  downloadButton.hidden = count === 0;
  downloadButton.disabled = false;
  downloadButton.querySelector('.download-label').textContent = `Baixar ${count} obra${count === 1 ? '' : 's'} em ZIP · ${formatSize(totalBytes)}`;
  const limitNote = document.querySelector('#queue-limit-note');
  limitNote.hidden = !atLimit;
  if (!count) {
    worksList.innerHTML = '<p class="empty-state">Nenhuma obra na fila. Adicione até 10 arquivos para gerar um único ZIP.</p>';
    return;
  }
  worksList.innerHTML = works.map((work, index) => `
    <article class="work-row">
      <div class="work-row-index">${String(index + 1).padStart(2, '0')}</div>
      <div>
        <strong>${escapeText(work.title)}</strong>
        <small>${escapeText(work.authors)} · ${escapeText(displayType(work.docType))}</small>
      </div>
      <div class="work-meta">${formatSize(work.fileSize)}<br>PDF + metadados</div>
    </article>
  `).join('');
}

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value >>> 0;
  }
  return table;
})();

async function crc32(blob) {
  let crc = 0xffffffff;
  const reader = blob.stream().getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    for (const byte of value) {
      crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(date) {
  const year = Math.max(1980, Math.min(2107, date.getFullYear()));
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1),
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  };
}

function writeUint16(view, offset, value) {
  view.setUint16(offset, value, true);
}

function writeUint32(view, offset, value) {
  view.setUint32(offset, value >>> 0, true);
}

function writeUint64(view, offset, value) {
  view.setBigUint64(offset, BigInt(value), true);
}

function localHeader(entry) {
  const view = new DataView(new ArrayBuffer(30 + entry.nameBytes.length));
  writeUint32(view, 0, 0x04034b50);
  writeUint16(view, 4, 20);
  writeUint16(view, 6, 0x0800);
  writeUint16(view, 8, 0);
  writeUint16(view, 10, entry.time);
  writeUint16(view, 12, entry.date);
  writeUint32(view, 14, entry.crc);
  writeUint32(view, 18, entry.size);
  writeUint32(view, 22, entry.size);
  writeUint16(view, 26, entry.nameBytes.length);
  writeUint16(view, 28, 0);
  new Uint8Array(view.buffer, 30).set(entry.nameBytes);
  return view.buffer;
}

function centralHeader(entry) {
  const needsZip64Offset = entry.offset > 0xffffffff;
  const extraLength = needsZip64Offset ? 12 : 0;
  const view = new DataView(new ArrayBuffer(46 + entry.nameBytes.length + extraLength));
  writeUint32(view, 0, 0x02014b50);
  writeUint16(view, 4, 45);
  writeUint16(view, 6, 45);
  writeUint16(view, 8, 0x0800);
  writeUint16(view, 10, 0);
  writeUint16(view, 12, entry.time);
  writeUint16(view, 14, entry.date);
  writeUint32(view, 16, entry.crc);
  writeUint32(view, 20, entry.size);
  writeUint32(view, 24, entry.size);
  writeUint16(view, 28, entry.nameBytes.length);
  writeUint16(view, 30, extraLength);
  writeUint16(view, 32, 0);
  writeUint16(view, 34, 0);
  writeUint16(view, 36, 0);
  writeUint32(view, 38, 0);
  writeUint32(view, 42, needsZip64Offset ? 0xffffffff : entry.offset);
  new Uint8Array(view.buffer, 46).set(entry.nameBytes);
  if (needsZip64Offset) {
    const extraOffset = 46 + entry.nameBytes.length;
    writeUint16(view, extraOffset, 0x0001);
    writeUint16(view, extraOffset + 2, 8);
    writeUint64(view, extraOffset + 4, entry.offset);
  }
  return view.buffer;
}

async function createZip() {
  const encoder = new TextEncoder();
  const sourceEntries = [];
  for (const work of works) {
    const json = new Blob([`${JSON.stringify(work.sidecar, null, 2)}\n`], { type: 'application/json;charset=utf-8' });
    sourceEntries.push({ name: `Obras/${work.pdfFilename}`, blob: work.file });
    sourceEntries.push({ name: `Obras/${work.metadataFilename}`, blob: json });
  }

  const parts = [];
  const entries = [];
  let offset = 0;
  const stamp = dosDateTime(new Date());
  for (const source of sourceEntries) {
    const nameBytes = encoder.encode(source.name);
    const headerEntry = {
      ...stamp,
      nameBytes,
      crc: await crc32(source.blob),
      size: source.blob.size,
      offset,
    };
    const header = localHeader(headerEntry);
    parts.push(header, source.blob);
    entries.push(headerEntry);
    offset += header.byteLength + source.blob.size;
  }

  const centralOffset = offset;
  const centralParts = entries.map(entry => {
    const header = centralHeader(entry);
    offset += header.byteLength;
    return header;
  });
  const centralSize = offset - centralOffset;
  const needsZip64 = centralOffset > 0xffffffff || centralSize > 0xffffffff;
  const endParts = [];
  const end = new DataView(new ArrayBuffer(22));
  writeUint32(end, 0, 0x06054b50);
  writeUint16(end, 4, 0);
  writeUint16(end, 6, 0);
  writeUint16(end, 8, needsZip64 ? 0xffff : entries.length);
  writeUint16(end, 10, needsZip64 ? 0xffff : entries.length);
  writeUint32(end, 12, needsZip64 ? 0xffffffff : centralSize);
  writeUint32(end, 16, needsZip64 ? 0xffffffff : centralOffset);
  writeUint16(end, 20, 0);
  if (needsZip64) {
    const zip64EndOffset = centralOffset + centralSize;
    const zip64End = new DataView(new ArrayBuffer(56));
    writeUint32(zip64End, 0, 0x06064b50);
    writeUint64(zip64End, 4, 44);
    writeUint16(zip64End, 12, 45);
    writeUint16(zip64End, 14, 45);
    writeUint32(zip64End, 16, 0);
    writeUint32(zip64End, 20, 0);
    writeUint64(zip64End, 24, entries.length);
    writeUint64(zip64End, 32, entries.length);
    writeUint64(zip64End, 40, centralSize);
    writeUint64(zip64End, 48, centralOffset);

    const locator = new DataView(new ArrayBuffer(20));
    writeUint32(locator, 0, 0x07064b50);
    writeUint32(locator, 4, 0);
    writeUint64(locator, 8, zip64EndOffset);
    writeUint32(locator, 16, 1);
    endParts.push(zip64End.buffer, locator.buffer);
  }
  return new Blob([...parts, ...centralParts, ...endParts, end.buffer], { type: 'application/zip' });
}

async function downloadWorks() {
  if (!works.length || downloadButton.disabled) return;
  downloadButton.disabled = true;
  downloadButton.classList.add('is-loading');
  downloadButton.querySelector('.download-label').textContent = 'Preparando o ZIP...';
  try {
    const zip = await createZip();
    const filenameDate = new Date().toISOString().slice(0, 10);
    const url = URL.createObjectURL(zip);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Citame-Obras-${filenameDate}.zip`;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 60000);
    works = [];
    resetForm();
  } catch (error) {
    errorBox.textContent = `Não foi possível criar o ZIP: ${error.message || 'erro desconhecido'}`;
    errorBox.hidden = false;
    updateQueueUI();
  } finally {
    downloadButton.classList.remove('is-loading');
  }
}

chooseButton.addEventListener('click', () => {
  if (works.length < MAX_WORKS) input.click();
});
changeButton.addEventListener('click', () => input.click());
cancelButton.addEventListener('click', resetForm);
newWorkButton.addEventListener('click', resetForm);
input.addEventListener('change', () => selectFile(input.files[0]));
docType.addEventListener('change', setFieldsForType);
form.addEventListener('submit', saveWork);
downloadButton.addEventListener('click', downloadWorks);

setFieldsForType();
updateQueueUI();
