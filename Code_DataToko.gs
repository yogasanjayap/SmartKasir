/**
 * SmartKasir — DATA TOKO (Opsi A)
 * Deploy oleh SETIAP TOKO di Google Sheet MILIK TOKO SENDIRI.
 * Semua data bisnis toko (produk, kategori, profil toko, foto QRIS,
 * database pelanggan, bill terbuka, dan transaksi) disimpan DI SINI.
 *
 * Cara pasang (toko):
 *   1. Buat Google Sheet baru (sheets.new), mis. "Data Toko Saya".
 *   2. Extensions > Apps Script > tempel SEMUA kode ini.
 *   3. (Opsional, disarankan) isi SECRET di bawah dgn kata sandi bebas.
 *   4. Deploy > New deployment > Web app > Execute as: Me, Who has access: Anyone > Deploy.
 *   5. Salin URL /exec, lalu di aplikasi SmartKasir buka Pengaturan >
 *      "Sinkron Sheet Toko" > tempel URL + secret > Sambungkan.
 *
 * Tab yang dibuat otomatis: "AppState" (snapshot data) & "Transaksi" (1 item = 1 baris).
 */

const SECRET = ''; // kosongkan = siapa saja yg tahu URL bisa menulis. Isi utk proteksi.

const STATE_SHEET = 'AppState';
const TX_SHEET    = 'Transaksi';
const CELL_CHUNK  = 45000;

const TX_HEADERS = [
  'Timestamp', 'ID Transaksi', 'Tanggal', 'Waktu', 'Toko', 'Pelanggan',
  'Nama Item', 'Kategori', 'Qty', 'Harga Satuan', 'Subtotal',
  'Metode', 'Total Transaksi', 'Uang Diterima', 'Kembalian', 'ItemsJSON'
];
const TX_ITEMSJSON_COL = 16;

function doGet() {
  return json({ ok: true, service: 'SmartKasir Data Toko', time: new Date().toISOString() });
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) return json({ ok: false, error: 'No data' });
    const body = JSON.parse(e.postData.contents);
    if (SECRET && String(body.secret || '') !== SECRET) return json({ ok: false, error: 'unauthorized' });
    const action = body.action;

    if (action === 'ping')   return json({ ok: true });
    if (action === 'pull')   return pull();
    if (action === 'push')   return push(body);
    if (action === 'append') return append(body);

    return json({ ok: false, error: 'unknown action: ' + action });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

/* ---------- STATE (produk, kategori, toko, pelanggan, bill) ---------- */

function pull() {
  const sh = getSheet_(STATE_SHEET);
  let state = null;
  if (sh.getLastRow() >= 1 && sh.getLastColumn() >= 2) {
    const vals = sh.getRange(1, 2, 1, sh.getLastColumn() - 1).getValues()[0];
    const jsonStr = vals.join('');
    if (jsonStr) { try { state = JSON.parse(jsonStr); } catch (e) {} }
  }
  return json({ ok: true, state: state, transactions: readTx_() });
}

function push(body) {
  const sh = getSheet_(STATE_SHEET);
  const jsonStr = JSON.stringify(body.state || {});
  const chunks = [];
  for (let i = 0; i < jsonStr.length; i += CELL_CHUNK) chunks.push(jsonStr.substr(i, CELL_CHUNK));
  if (chunks.length === 0) chunks.push('');
  const rowVals = [new Date().toISOString()].concat(chunks);
  const lastCol = sh.getLastColumn();
  if (lastCol > 0) sh.getRange(1, 1, 1, lastCol).clearContent(); // bersihkan chunk lama
  sh.getRange(1, 1, 1, rowVals.length).setValues([rowVals]);
  return json({ ok: true });
}

/* ---------- TRANSAKSI (1 item = 1 baris) ---------- */

function append(body) {
  const txs = Array.isArray(body.txs) ? body.txs : (body.tx ? [body.tx] : []);
  const sh = txSheet_();
  const existing = existingIds_(sh);
  const rows = [];
  let added = 0, skipped = 0;
  txs.forEach(function (t) {
    if (!t || !t.id) return;
    if (existing.has(String(t.id))) { skipped++; return; }
    existing.add(String(t.id));
    txToRows_(t, body.store || '').forEach(function (r) { rows.push(r); });
    added++;
  });
  if (rows.length) sh.getRange(sh.getLastRow() + 1, 1, rows.length, TX_HEADERS.length).setValues(rows);
  return json({ ok: true, added: added, skipped: skipped });
}

function readTx_() {
  const sh = txSheet_();
  const last = sh.getLastRow();
  if (last < 2) return [];
  const vals = sh.getRange(2, 1, last - 1, TX_HEADERS.length).getValues();
  const out = [];
  for (let i = 0; i < vals.length; i++) {
    const raw = vals[i][TX_ITEMSJSON_COL - 1]; // ItemsJSON hanya di baris pertama tiap transaksi
    if (raw === '' || raw === null || typeof raw === 'undefined') continue;
    let items = [];
    try { items = JSON.parse(raw || '[]'); } catch (e) {}
    out.push({
      id: String(vals[i][1]),
      timestamp: vals[i][0] instanceof Date ? vals[i][0].toISOString() : String(vals[i][0]),
      customer: String(vals[i][5] || ''),
      items: items,
      total: Number(vals[i][12]) || 0,
      paymentMethod: String(vals[i][11] || ''),
      amountPaid: Number(vals[i][13]) || 0,
      change: Number(vals[i][14]) || 0
    });
  }
  out.sort(function (a, b) { return new Date(b.timestamp) - new Date(a.timestamp); });
  return out.slice(0, 3000);
}

function txSheet_() {
  const sh = getSheet_(TX_SHEET);
  if (sh.getLastRow() === 0) {
    sh.appendRow(TX_HEADERS);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, TX_HEADERS.length).setFontWeight('bold');
    sh.hideColumns(TX_ITEMSJSON_COL);
  }
  return sh;
}

function existingIds_(sh) {
  const set = new Set();
  const last = sh.getLastRow();
  if (last < 2) return set;
  const vals = sh.getRange(2, 2, last - 1, 1).getValues(); // kolom B = ID
  vals.forEach(function (r) { if (r[0]) set.add(String(r[0])); });
  return set;
}

function txToRows_(t, storeName) {
  const d = t.timestamp ? new Date(t.timestamp) : new Date();
  const tz = Session.getScriptTimeZone();
  const tanggal = Utilities.formatDate(d, tz, 'yyyy-MM-dd');
  const waktu = Utilities.formatDate(d, tz, 'HH:mm');
  const ts = t.timestamp || d.toISOString();
  const cust = t.customer || '';
  const items = (Array.isArray(t.items) && t.items.length) ? t.items : [{ name: '(tanpa item)', qty: '', price: '', category: '' }];
  const rows = [];
  items.forEach(function (it, idx) {
    const qty = Number(it.qty) || 0;
    const price = Number(it.price) || 0;
    const isFirst = idx === 0;
    rows.push([
      ts, t.id, tanggal, waktu, storeName, cust,
      it.name || '', it.category || '',
      it.qty === '' ? '' : qty,
      it.price === '' ? '' : price,
      (it.qty === '' || it.price === '') ? '' : qty * price,
      t.paymentMethod || '',
      isFirst ? (Number(t.total) || 0) : '',
      isFirst ? (Number(t.amountPaid) || 0) : '',
      isFirst ? (Number(t.change) || 0) : '',
      isFirst ? JSON.stringify(t.items || []) : ''
    ]);
  });
  return rows;
}

function getSheet_(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  return sh;
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
