/**
 * SmartKasir — REGISTRY (Opsi A)
 * Deploy oleh PEMILIK APLIKASI (admin). Tempel URL /exec-nya ke `BACKEND_URL` di index.html.
 *
 * Registry HANYA menyimpan (tab "Users"):
 *   nama toko (username) | salt | hash password | dibuat | Login Terakhir | Data URL | Data Secret
 *
 * TIDAK ada data bisnis di sini. Produk/pelanggan/transaksi/bill disimpan di
 * Sheet milik tiap toko (lihat Code_DataToko.gs), yang URL-nya dicatat di kolom "Data URL".
 *
 * Cara pasang: Extensions > Apps Script > tempel semua kode ini > Deploy > New deployment >
 *   Web app > Execute as: Me, Who has access: Anyone > salin URL /exec.
 * (Opsional) Isi REGISTER_CODE agar tidak sembarang orang bisa mendaftar.
 */

const REGISTER_CODE = '';
const USERS_SHEET = 'Users';
const USERS_HEADERS = ['username', 'salt', 'hash', 'created', 'Login Terakhir', 'Data URL', 'Data Secret'];

function doGet() {
  return json({ ok: true, service: 'SmartKasir Registry', requiresCode: !!REGISTER_CODE, time: new Date().toISOString() });
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) return json({ ok: false, error: 'No data' });
    const body = JSON.parse(e.postData.contents);
    const action = body.action;

    if (action === 'ping')     return json({ ok: true });
    if (action === 'register') return register(body);
    if (action === 'login')    return login(body);

    const user = authUser(body);
    if (!user) return json({ ok: false, error: 'unauthorized' });

    if (action === 'setdataurl') return setDataUrl(user, body);
    if (action === 'getdataurl') {
      const rec = findUser_(user);
      return json({ ok: true, dataUrl: rec ? rec.dataUrl : '', dataSecret: rec ? rec.dataSecret : '' });
    }

    return json({ ok: false, error: 'unknown action: ' + action });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

function register(body) {
  const u = String(body.username || '').trim().toLowerCase();
  const p = String(body.password || '');
  if (REGISTER_CODE && String(body.code || '').trim() !== String(REGISTER_CODE).trim()) {
    return json({ ok: false, error: 'Kode pendaftaran salah' });
  }
  if (u.length < 3 || p.length < 4) {
    return json({ ok: false, error: 'Username minimal 3 & password minimal 4 karakter' });
  }
  if (findUser_(u)) return json({ ok: false, error: 'Username sudah dipakai' });

  const salt = sha_(String(Math.random()) + Date.now()).slice(0, 16);
  const hash = sha_(salt + p);
  const now = new Date().toISOString();
  usersSheet_().appendRow([u, salt, hash, now, now, '', '']);
  return json({ ok: true, username: u, token: makeToken_(u, hash), dataUrl: '', dataSecret: '' });
}

function login(body) {
  const u = String(body.username || '').trim().toLowerCase();
  const p = String(body.password || '');
  const rec = findUser_(u);
  if (!rec) return json({ ok: false, error: 'Username tidak ditemukan' });
  if (sha_(rec.salt + p) !== rec.hash) return json({ ok: false, error: 'Password salah' });
  touchLastLogin_(rec.row);
  return json({ ok: true, username: u, token: makeToken_(u, rec.hash), dataUrl: rec.dataUrl, dataSecret: rec.dataSecret });
}

function setDataUrl(user, body) {
  const rec = findUser_(user);
  if (!rec) return json({ ok: false, error: 'Akun tidak ditemukan' });
  const sh = usersSheet_();
  sh.getRange(rec.row, 6).setValue(String(body.dataUrl || ''));
  sh.getRange(rec.row, 7).setValue(String(body.dataSecret || ''));
  return json({ ok: true });
}

function authUser(body) {
  const u = String(body.username || '').trim().toLowerCase();
  const rec = findUser_(u);
  if (!rec) return null;
  if (makeToken_(u, rec.hash) !== body.token) return null;
  return u;
}

function usersSheet_() {
  const sh = getSheet_(USERS_SHEET);
  if (sh.getLastRow() === 0) {
    sh.appendRow(USERS_HEADERS);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, USERS_HEADERS.length).setFontWeight('bold');
  }
  return sh;
}

function touchLastLogin_(row) {
  try { usersSheet_().getRange(row, 5).setValue(new Date().toISOString()); } catch (e) {}
}

function findUser_(username) {
  const sh = usersSheet_();
  const last = sh.getLastRow();
  if (last < 2) return null;
  const vals = sh.getRange(2, 1, last - 1, USERS_HEADERS.length).getValues();
  for (let i = 0; i < vals.length; i++) {
    if (String(vals[i][0]) === username) {
      return {
        row: i + 2, salt: String(vals[i][1]), hash: String(vals[i][2]),
        dataUrl: String(vals[i][5] || ''), dataSecret: String(vals[i][6] || '')
      };
    }
  }
  return null;
}

function makeToken_(username, hash) {
  return sha_(username + '|' + hash + '|smartkasir-token-v1');
}

function sha_(s) {
  const raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s, Utilities.Charset.UTF_8);
  return raw.map(function (b) { return ('0' + (b & 0xff).toString(16)).slice(-2); }).join('');
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
