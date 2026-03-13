import wixData from 'wix-data';
import { ok, response } from 'wix-http-functions';

function corsHeaders(extra = {}) {
  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    ...extra
  };
}

function apiCors(body = {}, status = 200, extraHeaders = {}) {
  return response({
    status,
    headers: corsHeaders(extraHeaders),
    body
  });
}

function toStr(v) { return String(v ?? '').trim(); }
function toNum(v, dflt = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : dflt;
}
function normalizePhone(v) { return String(v || '').replace(/\D/g, ''); }

function poolilyPublicUser(user = {}) {
  return {
    userId: toStr(user.userId || user._id),
    id: toStr(user.userId || user._id),
    name: toStr(user.name),
    phone: normalizePhone(user.phone),
    role: toStr(user.role || 'passenger'),
    walletBalance: toNum(user.walletBalance, 0),
    walletAccountNumber: toStr(user.walletAccountNumber),
    walletBank: toStr(user.walletBank || 'Stanbic IBTC'),
    walletHistory: Array.isArray(user.walletHistory) ? user.walletHistory : [],
    bankDetails: user.bankDetails || { bankCode: "", accountNumber: "", accountName: "" },
    plateNumber: toStr(user.plateNumber) || null,
    carYear: toStr(user.carYear) || null,
    carMake: toStr(user.carMake) || null,
    carModel: toStr(user.carModel) || null,
    carType: toStr(user.carType) || null,
    profilePhoto: toStr(user.profilePhoto) || null
  };
}

async function poolilyAccountExists(accountNumber) {
  const acct = toStr(accountNumber);
  if (!acct) return false;

  const checks = await Promise.all([
    wixData.query('Employees').eq('peygoIssuedAccountNumber', acct).limit(1).find({ suppressAuth: true }),
    wixData.query('WedlyUsers').eq('wedlyAccountNum', acct).limit(1).find({ suppressAuth: true }),
    wixData.query('SafeMeetUsers').eq('virtualAccountNumber', acct).limit(1).find({ suppressAuth: true }),
    wixData.query('InternetUsers').eq('virtualAccountNumber', acct).limit(1).find({ suppressAuth: true }),
    wixData.query('PoolilyUsers').eq('walletAccountNumber', acct).limit(1).find({ suppressAuth: true })
  ]);

  return checks.some((result) => (result.items || []).length > 0);
}

async function generateUniquePoolilyVirtualAccount(prefix = "5770", maxAttempts = 24) {
  for (let i = 0; i < maxAttempts; i += 1) {
    const seed = Math.floor(100000 + Math.random() * 900000);
    const account = `${prefix}${seed}`;
    const exists = await poolilyAccountExists(account);
    if (!exists) return account;
  }
  throw new Error("Could not generate unique Poolily virtual account");
}

async function findPoolilyUserByPhone(phone) {
  const cleanPhone = normalizePhone(phone);
  if (!cleanPhone) return null;
  const result = await wixData.query('PoolilyUsers')
    .eq('phone', cleanPhone)
    .limit(1)
    .find({ suppressAuth: true });
  return result.items?.[0] || null;
}

async function findPoolilyUserById(userId) {
  const id = toStr(userId);
  if (!id) return null;

  const byUserId = await wixData.query('PoolilyUsers')
    .eq('userId', id)
    .limit(1)
    .find({ suppressAuth: true });
  if (byUserId.items?.length) return byUserId.items[0];

  try {
    return await wixData.get('PoolilyUsers', id, { suppressAuth: true });
  } catch (_) {
    return null;
  }
}

async function getPoolilyUser(payload = {}) {
  return await findPoolilyUserById(payload.userId) || await findPoolilyUserByPhone(payload.phone);
}

async function handleCheckUserByPhone(payload) {
  const user = await findPoolilyUserByPhone(payload.phone);
  return {
    success: true,
    exists: !!user,
    role: user ? toStr(user.role || 'passenger') : ''
  };
}

async function handleRegisterUser(payload) {
  const phone = normalizePhone(payload.phone);
  const role = toStr(payload.role || 'passenger') || 'passenger';
  const name = toStr(payload.name);
  const pin = toStr(payload.pin);

  if (!phone || !name || pin.length !== 4) {
    return { success: false, code: 'INVALID_PAYLOAD', message: 'Name, phone and 4-digit PIN are required.' };
  }

  const existing = await findPoolilyUserByPhone(phone);
  if (existing) {
    if (toStr(existing.role || 'passenger') !== role) {
      return { success: false, code: 'USER_ROLE_MISMATCH', message: 'Phone number already belongs to another role.' };
    }
    return { success: false, code: 'USER_EXISTS', message: 'Phone number already exists.' };
  }

  const walletAccountNumber = toStr(payload.walletAccountNumber) || await generateUniquePoolilyVirtualAccount("5770");
  const userId = toStr(payload.userId) || `poolily-${Date.now()}`;
  const user = {
    userId,
    name,
    phone,
    pin,
    role,
    profilePhoto: toStr(payload.profilePhoto),
    plateNumber: toStr(payload.plateNumber) || null,
    carYear: toStr(payload.carYear) || null,
    carMake: toStr(payload.carMake) || null,
    carModel: toStr(payload.carModel) || null,
    carType: toStr(payload.carType) || null,
    walletBalance: toNum(payload.walletBalance, 0),
    walletAccountNumber,
    walletBank: toStr(payload.walletBank || 'Stanbic IBTC'),
    walletHistory: Array.isArray(payload.walletHistory) ? payload.walletHistory : [],
    bankDetails: payload.bankDetails || { bankCode: "", accountNumber: "", accountName: "" },
    idType: toStr(payload.idType),
    idNumber: toStr(payload.idNumber),
    idPhoto: toStr(payload.idPhoto),
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const inserted = await wixData.insert('PoolilyUsers', user, { suppressAuth: true });
  return { success: true, user: poolilyPublicUser(inserted) };
}

async function handleLoginUser(payload) {
  const phone = normalizePhone(payload.phone);
  const pin = toStr(payload.pin);
  const role = toStr(payload.role || '');

  const user = await findPoolilyUserByPhone(phone);
  if (!user) return { success: false, code: 'USER_NOT_FOUND', message: 'User not found.' };
  if (toStr(user.pin) !== pin) return { success: false, code: 'INVALID_PIN', message: 'Invalid PIN.' };
  if (role && toStr(user.role || 'passenger') !== role) {
    return { success: false, code: 'USER_ROLE_MISMATCH', message: 'Wrong role for this phone number.' };
  }

  return { success: true, user: poolilyPublicUser(user) };
}

async function handleGetWalletStatus(payload) {
  const user = await getPoolilyUser(payload);
  if (!user) return { success: false, code: 'USER_NOT_FOUND', message: 'User not found.' };
  return { success: true, user: poolilyPublicUser(user) };
}

async function handleSyncRecord(payload) {
  const entity = toStr(payload.entity);
  const data = payload.data || {};
  const mode = toStr(payload.mode || 'append');

  if (entity === 'Users') {
    const existing = await getPoolilyUser(data);
    if (!existing) {
      return { success: false, code: 'USER_NOT_FOUND', message: 'User record not found for sync.' };
    }

    existing.name = toStr(data.name || existing.name);
    existing.phone = normalizePhone(data.phone || existing.phone);
    existing.role = toStr(data.role || existing.role || 'passenger');
    existing.walletBalance = toNum(data.walletBalance, existing.walletBalance);
    existing.walletAccountNumber = toStr(data.walletAccountNumber || existing.walletAccountNumber);
    existing.walletBank = toStr(data.walletBank || existing.walletBank || 'Stanbic IBTC');
    existing.walletHistory = Array.isArray(data.walletHistory) ? data.walletHistory : (existing.walletHistory || []);
    existing.bankDetails = data.bankDetails || existing.bankDetails || { bankCode: "", accountNumber: "", accountName: "" };
    existing.profilePhoto = toStr(data.profilePhoto || existing.profilePhoto);
    existing.updatedAt = new Date();

    const updated = await wixData.update('PoolilyUsers', existing, { suppressAuth: true });
    return { success: true, user: poolilyPublicUser(updated) };
  }

  const collections = {
    WalletTransactions: 'PoolilyWalletTransactions',
    RideRequests: 'PoolilyRideRequests',
    Rides: 'PoolilyRides',
    Events: 'PoolilyEvents',
    StepEvents: 'PoolilyStepEvents'
  };
  const collectionName = collections[entity];
  if (!collectionName) {
    return { success: false, code: 'UNSUPPORTED_ENTITY', message: `Unsupported entity: ${entity}` };
  }

  const inserted = await wixData.insert(collectionName, {
    ...data,
    createdAt: new Date()
  }, { suppressAuth: true });

  return { success: true, item: inserted };
}

function parseGatewayRequest(rawBody = '') {
  const params = new URLSearchParams(rawBody);
  const action = toStr(params.get('action'));
  const payloadRaw = params.get('payload');
  let payload = {};

  try {
    payload = payloadRaw ? JSON.parse(payloadRaw) : {};
  } catch (_) {
    payload = {};
  }

  return { action, payload };
}

export async function post_poolilyGateway(request) {
  try {
    const rawBody = await request.body.text();
    const { action, payload } = parseGatewayRequest(rawBody);

    if (!action) {
      return apiCors({ success: false, code: 'MISSING_ACTION', message: 'Action is required.' }, 400);
    }

    let result = null;
    if (action === 'checkUserByPhone') result = await handleCheckUserByPhone(payload);
    else if (action === 'registerUser') result = await handleRegisterUser(payload);
    else if (action === 'loginUser') result = await handleLoginUser(payload);
    else if (action === 'getWalletStatus') result = await handleGetWalletStatus(payload);
    else if (action === 'syncRecord') result = await handleSyncRecord(payload);
    else result = { success: false, code: 'UNKNOWN_ACTION', message: `Unsupported action: ${action}` };

    return apiCors(result, result.success === false ? 400 : 200);
  } catch (err) {
    return apiCors({ success: false, code: 'SERVER_ERROR', message: err.message }, 500);
  }
}

export function options_poolilyGateway() {
  return ok({ headers: corsHeaders() });
}

/*
Add these two Poolily blocks into your existing Stanbic handlers.

1. In post_stanbicNameEnquiry:

const poolilyUser = await findOneByFieldStrOrNum('PoolilyUsers', 'walletAccountNumber', acctStr);
if (poolilyUser) {
  user = poolilyUser;
  systemType = 'Poolily';
  matchedName = `Poolily - ${poolilyUser.name}`;
  matchedAccountNum = poolilyUser.walletAccountNumber;
}

2. In post_stanbicNotifications:

const poolilyUser = await findOneByFieldStrOrNum('PoolilyUsers', 'walletAccountNumber', acctStr);
if (poolilyUser) {
  const existing = await wixData.query('PoolilyDeposits')
    .eq('transactionId', txId)
    .limit(1)
    .find({ suppressAuth: true });

  if (existing.totalCount === 0) {
    const paidAt = new Date(tx.timestamp || Date.now());
    const amountPaid = Math.max(0, toNum(tx.amount, 0));

    await wixData.insert('PoolilyDeposits', {
      timestamp: paidAt,
      transactionId: txId,
      walletAccountNumber: acctStr,
      userId: toStr(poolilyUser.userId || poolilyUser._id),
      amount: amountPaid,
      senderName: toStr(tx.srcAcctName),
      sourceBank: toStr(tx.srcBank),
      sessionId: toStr(tx.sessionId)
    }, { suppressAuth: true });

    poolilyUser.walletBalance = toNum(poolilyUser.walletBalance, 0) + amountPaid;
    poolilyUser.lastPaymentAmount = amountPaid;
    poolilyUser.lastPaymentDate = paidAt;
    poolilyUser.updatedAt = new Date();

    const history = Array.isArray(poolilyUser.walletHistory) ? poolilyUser.walletHistory : [];
    history.unshift({
      desc: `Wallet funding from ${toStr(tx.srcAcctName) || 'Bank transfer'}`,
      amount: `+₦${amountPaid.toLocaleString()}`,
      date: paidAt.toISOString(),
      type: 'credit'
    });
    poolilyUser.walletHistory = history.slice(0, 50);

    await wixData.update('PoolilyUsers', poolilyUser, { suppressAuth: true });
  }

  processed = true;
  statusMessage = 'Successful (Poolily Wallet Funding)';
}
*/
